import type { RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { MediaModel } from '../models/media.model.js';
import {
  checkDataUrl,
  cloudinaryConfigured,
  deleteAsset,
  deleteAssets,
  resourceKind,
  uploadAsset,
  type ResourceKind,
} from '../lib/cloudinary.js';
import type { ApiError } from '../types/index.js';

/** Ceiling on one upload. Video is the reason this is not smaller. */
const MAX_BYTES = 25 * 1024 * 1024;

const fileSchema = z.object({
  /** The file as a base64 data URL. */
  file: z.string().min(1, 'A file is required'),
  name: z.string().min(1).max(160),
  alt: z.string().max(300).default(''),
});

/** Accepts one file or a `files` array; both land as an array internally. */
const uploadSchema = z.union([
  fileSchema.transform((f) => ({ files: [f] })),
  z.object({ files: z.array(fileSchema).min(1).max(50) }),
]);

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
});

const updateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  alt: z.string().max(300).optional(),
});

interface MediaDoc {
  _id: unknown;
  name: string;
  alt?: string;
  url: string;
  publicId: string;
  kind: string;
  mime: string;
  format?: string;
  bytes?: number;
  width?: number | null;
  height?: number | null;
  thumbnailUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

function toResponse(doc: MediaDoc) {
  return {
    id: String(doc._id),
    name: doc.name,
    alt: doc.alt ?? '',
    url: doc.url,
    kind: doc.kind,
    mime: doc.mime,
    format: doc.format ?? '',
    bytes: doc.bytes ?? 0,
    width: doc.width ?? null,
    height: doc.height ?? null,
    // Falls back to the asset itself: a picker needs something to show, and for
    // an image the original is a valid preview.
    thumbnailUrl: doc.thumbnailUrl || (doc.kind === 'image' ? doc.url : ''),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}


function assetId(): string {
  return randomBytes(12).toString('hex');
}

export const listMedia: RequestHandler = async (req, res) => {
  const { workspaceId } = req.params;
  const { kind, q } = req.query;

  const filter: Record<string, unknown> = { workspaceId };
  if (kind === 'image' || kind === 'video' || kind === 'raw') filter.kind = kind;
  if (typeof q === 'string' && q.trim()) {
    const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = { $regex: safe, $options: 'i' };
  }

  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const perPageRaw = Number.parseInt(String(req.query.perPage ?? '40'), 10) || 40;
  const perPage = Math.min(100, Math.max(1, perPageRaw));

  const [items, total] = await Promise.all([
    MediaModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage),
    MediaModel.countDocuments(filter),
  ]);

  res.json({
    items: items.map((doc) => toResponse(doc as unknown as MediaDoc)),
    total,
    page,
    perPage,
  });
};

export const uploadMedia: RequestHandler = async (req, res) => {
  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  if (!cloudinaryConfigured()) {
    const body: ApiError = {
      error: 'storage_unavailable',
      message: 'File storage is not configured',
    };
    res.status(503).json(body);
    return;
  }

  const { workspaceId } = req.params;
  const { files } = parsed.data;

  const results = await Promise.all(
    files.map(async ({ file, name, alt }) => {
      const checked = checkDataUrl(file, MAX_BYTES);
      if ('error' in checked) return { ok: false as const, name, message: checked.error };

      const kind: ResourceKind = resourceKind(checked.mime);

      try {
        const uploaded = await uploadAsset({
          file,
          folder: `da-cms/${workspaceId}`,
          publicId: assetId(),
          kind,
        });

        const doc = await MediaModel.create({
          workspaceId,
          name,
          alt,
          url: uploaded.url,
          publicId: uploaded.publicId,
          kind: uploaded.kind,
          mime: checked.mime,
          format: uploaded.format,
          bytes: uploaded.bytes || checked.bytes,
          width: uploaded.width ?? null,
          height: uploaded.height ?? null,
          thumbnailUrl: uploaded.thumbnailUrl ?? '',
          uploadedBy: req.userId,
        });

        return { ok: true as const, doc: doc as unknown as MediaDoc };
      } catch (err) {
        return {
          ok: false as const,
          name,
          message: err instanceof Error ? err.message : 'Could not upload that file',
        };
      }
    })
  );

  const items = results.filter((r) => r.ok).map((r) => toResponse(r.doc));
  const failed = results
    .filter((r) => !r.ok)
    .map((r) => ({ name: r.name, message: r.message }));

  if (items.length === 0) {
    const body: ApiError = {
      error: 'upload_failed',
      message: failed[0]?.message ?? 'Could not upload those files',
    };
    res.status(502).json(body);
    return;
  }

  // 207: some succeeded, some did not.
  res.status(failed.length ? 207 : 201).json({ items, failed });
};

export const bulkDeleteMedia: RequestHandler = async (req, res) => {
  const parsed = bulkDeleteSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { workspaceId } = req.params;
  const docs = await MediaModel.find({ _id: { $in: parsed.data.ids }, workspaceId });

  if (docs.length === 0) {
    const body: ApiError = { error: 'not_found', message: 'No such files' };
    res.status(404).json(body);
    return;
  }

  await MediaModel.deleteMany({ _id: { $in: docs.map((d) => d._id) }, workspaceId });

  // Cloudinary addresses assets per pipeline, so group by kind.
  const byKind: Record<ResourceKind, string[]> = { image: [], video: [], raw: [] };
  for (const doc of docs) {
    byKind[doc.kind as ResourceKind]?.push(doc.publicId);
  }

  // Storage cleanup runs after the response — the library already no longer
  // lists these, and an orphaned file is not worth making the user wait for.
  void Promise.all(
    (Object.keys(byKind) as ResourceKind[])
      .filter((k) => byKind[k].length)
      .map((k) => deleteAssets(byKind[k], k))
  );

  res.json({ deleted: docs.map((d) => String(d._id)) });
};

export const updateMedia: RequestHandler = async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { workspaceId, id } = req.params;
  const doc = await MediaModel.findOneAndUpdate({ _id: id, workspaceId }, parsed.data, {
    new: true,
  });

  if (!doc) {
    const body: ApiError = { error: 'not_found', message: 'No such file' };
    res.status(404).json(body);
    return;
  }

  res.json(toResponse(doc as unknown as MediaDoc));
};


export const deleteMedia: RequestHandler = async (req, res) => {
  const { workspaceId, id } = req.params;
  const doc = await MediaModel.findOneAndDelete({ _id: id, workspaceId });

  if (!doc) {
    const body: ApiError = { error: 'not_found', message: 'No such file' };
    res.status(404).json(body);
    return;
  }

  // The DB row is the source of truth for what the library shows; the stored
  // file is orphaned storage at worst. Do not hold the response on Cloudinary.
  void deleteAsset(doc.publicId, doc.kind as ResourceKind);
  res.status(204).end();
};
