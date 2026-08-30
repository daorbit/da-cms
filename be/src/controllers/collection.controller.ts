import type { RequestHandler } from 'express';
import { z } from 'zod';
import { CollectionModel } from '../models/collection.model.js';
import { slugify } from '../lib/slugify.js';
import type { ApiError } from '../types/index.js';

const fieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'richtext', 'number', 'boolean', 'date', 'image']),
  required: z.boolean().optional(),
});

const collectionSchema = z.object({
  name: z.string().min(1),
  fields: z.array(fieldSchema).default([]),
});

function toResponse(collection: {
  _id: unknown;
  name: string;
  slug: string;
  fields: unknown;
}) {
  return {
    id: String(collection._id),
    name: collection.name,
    slug: collection.slug,
    fields: collection.fields,
  };
}

export const createCollection: RequestHandler = async (req, res) => {
  const parsed = collectionSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { name, fields } = parsed.data;
  const { workspaceId } = req.params;
  const slug = slugify(name);

  const collection = await CollectionModel.create({ workspaceId, name, slug, fields });
  res.status(201).json(toResponse(collection));
};

export const listCollections: RequestHandler = async (req, res) => {
  const { workspaceId } = req.params;
  const collections = await CollectionModel.find({ workspaceId }).sort({ createdAt: -1 });
  res.json(collections.map(toResponse));
};

export const getCollection: RequestHandler = async (req, res) => {
  const { workspaceId, id } = req.params;
  const collection = await CollectionModel.findOne({ _id: id, workspaceId });
  if (!collection) {
    const body: ApiError = { error: 'not_found', message: 'Collection not found' };
    res.status(404).json(body);
    return;
  }
  res.json(toResponse(collection));
};

export const updateCollection: RequestHandler = async (req, res) => {
  const parsed = collectionSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { workspaceId, id } = req.params;
  const update = { ...parsed.data, ...(parsed.data.name ? { slug: slugify(parsed.data.name) } : {}) };
  const collection = await CollectionModel.findOneAndUpdate({ _id: id, workspaceId }, update, { new: true });

  if (!collection) {
    const body: ApiError = { error: 'not_found', message: 'Collection not found' };
    res.status(404).json(body);
    return;
  }
  res.json(toResponse(collection));
};

export const deleteCollection: RequestHandler = async (req, res) => {
  const { workspaceId, id } = req.params;
  const result = await CollectionModel.findOneAndDelete({ _id: id, workspaceId });
  if (!result) {
    const body: ApiError = { error: 'not_found', message: 'Collection not found' };
    res.status(404).json(body);
    return;
  }
  res.status(204).end();
};
