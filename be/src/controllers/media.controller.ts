import type { RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { MediaModel } from '../models/media.model.js';
import {
  checkDataUrl,
  cloudinaryConfigured,
  deleteAsset,
  resourceKind,
  uploadAsset,
  type ResourceKind,
} from '../lib/cloudinary.js';
import type { ApiError } from '../types/index.js';

/** Ceiling on one upload. Video is the reason this is not smaller. */
const MAX_BYTES = 25 * 1024 * 1024;

const uploadSchema = z.object({
  /** The file as a base64 data URL. */
  file: z.string().min(1, 'A file is required'),
  name: z.string().min(1).max(160),
  alt: z.string().max(300).default(''),
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

  const { file, name, alt } = parsed.data;

  const checked = checkDataUrl(file, MAX_BYTES);
  if ('error' in checked) {
    const body: ApiError = { error: 'invalid_input', message: checked.error };
    res.status(400).json(body);
    return;
  }

  const { workspaceId } = req.params;
  const kind: ResourceKind = resourceKind(checked.mime);

  let uploaded;
  try {
    uploaded = await uploadAsset({
      file,

      folder: `da-cms/${workspaceId}`,
      publicId: assetId(),
      kind,
    });
  } catch (err) {
    const body: ApiError = {
      error: 'upload_failed',
      message: err instanceof Error ? err.message : 'Could not upload that file',
    };
    res.status(502).json(body);
    return;
  }

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

  res.status(201).json(toResponse(doc as unknown as MediaDoc));
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

  await deleteAsset(doc.publicId, doc.kind as ResourceKind);
  res.status(204).end();
};
