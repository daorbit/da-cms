import type { RequestHandler } from 'express';
import { z } from 'zod';
import { MediaModel } from '../models/media.model.js';
import { deleteAsset, deleteAssets, type ResourceKind } from '../lib/cloudinary.js';
import {
  listMedia as listMediaRecords,
  toResponse,
  uploadFiles,
  type MediaDoc,
} from '../services/media.service.js';
import type { ApiError } from '../types/index.js';

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

export const listMedia: RequestHandler = async (req, res) => {
  res.json(await listMediaRecords(req.params.workspaceId, req.query));
};

export const uploadMedia: RequestHandler = async (req, res) => {
  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { items, failed } = await uploadFiles(req.params.workspaceId, req.userId, parsed.data.files);

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
