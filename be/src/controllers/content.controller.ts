import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ContentModel } from '../models/content.model.js';
import type { ApiError } from '../types/index.js';

const contentSchema = z.object({
  data: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(['draft', 'published']).default('draft'),
});

function toResponse(content: {
  _id: unknown;
  data: unknown;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: String(content._id),
    data: content.data,
    status: content.status,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
  };
}

export const createContent: RequestHandler = async (req, res) => {
  const parsed = contentSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { workspaceId, collectionId } = req.params;
  const content = await ContentModel.create({ workspaceId, collectionId, ...parsed.data });
  res.status(201).json(toResponse(content));
};

export const listContent: RequestHandler = async (req, res) => {
  const { workspaceId, collectionId } = req.params;
  const items = await ContentModel.find({ workspaceId, collectionId }).sort({ createdAt: -1 });
  res.json(items.map(toResponse));
};

export const getContent: RequestHandler = async (req, res) => {
  const { workspaceId, collectionId, id } = req.params;
  const content = await ContentModel.findOne({ _id: id, workspaceId, collectionId });
  if (!content) {
    const body: ApiError = { error: 'not_found', message: 'Content not found' };
    res.status(404).json(body);
    return;
  }
  res.json(toResponse(content));
};

export const updateContent: RequestHandler = async (req, res) => {
  const parsed = contentSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { workspaceId, collectionId, id } = req.params;
  const content = await ContentModel.findOneAndUpdate(
    { _id: id, workspaceId, collectionId },
    parsed.data,
    { new: true }
  );

  if (!content) {
    const body: ApiError = { error: 'not_found', message: 'Content not found' };
    res.status(404).json(body);
    return;
  }
  res.json(toResponse(content));
};

export const deleteContent: RequestHandler = async (req, res) => {
  const { workspaceId, collectionId, id } = req.params;
  const result = await ContentModel.findOneAndDelete({ _id: id, workspaceId, collectionId });
  if (!result) {
    const body: ApiError = { error: 'not_found', message: 'Content not found' };
    res.status(404).json(body);
    return;
  }
  res.status(204).end();
};
