import type { RequestHandler } from 'express';
import { z } from 'zod';
import { WorkspaceModel } from '../models/workspace.model.js';
import { MembershipModel } from '../models/membership.model.js';
import { slugify } from '../lib/slugify.js';
import type { ApiError } from '../types/index.js';

const createWorkspaceSchema = z.object({
  name: z.string().min(1),
});

export const createWorkspace: RequestHandler = async (req, res) => {
  const parsed = createWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { name } = parsed.data;
  const baseSlug = slugify(name) || 'workspace';
  let slug = baseSlug;
  let suffix = 1;
  while (await WorkspaceModel.exists({ slug })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const workspace = await WorkspaceModel.create({ name, slug, ownerId: req.userId });
  await MembershipModel.create({ userId: req.userId, workspaceId: workspace._id, role: 'owner' });

  res.status(201).json({ id: String(workspace._id), name: workspace.name, slug: workspace.slug });
};

export const listWorkspaces: RequestHandler = async (req, res) => {
  const memberships = await MembershipModel.find({ userId: req.userId });
  const workspaces = await WorkspaceModel.find({ _id: { $in: memberships.map((m) => m.workspaceId) } });
  res.json(workspaces.map((w) => ({ id: String(w._id), name: w.name, slug: w.slug })));
};
