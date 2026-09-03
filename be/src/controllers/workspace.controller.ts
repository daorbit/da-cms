import type { RequestHandler } from 'express';
import { z } from 'zod';
import { WorkspaceModel } from '../models/workspace.model.js';
import { MembershipModel } from '../models/membership.model.js';
import { UserModel } from '../models/user.model.js';
import { slugify } from '../lib/slugify.js';
import { mailConfigured, sendWelcomeEmail } from '../lib/mailer.js';
import type { ApiError } from '../types/index.js';

const createWorkspaceSchema = z.object({
  name: z.string().min(1),
  // Accepts an empty string as "not given" — the onboarding field is optional,
  // and z.url() would reject "" as malformed rather than absent.
  websiteUrl: z.union([z.string().url(), z.literal('')]).default(''),
});

export const createWorkspace: RequestHandler = async (req, res) => {
  const parsed = createWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { name, websiteUrl } = parsed.data;
  const baseSlug = slugify(name) || 'workspace';
  let slug = baseSlug;
  let suffix = 1;
  while (await WorkspaceModel.exists({ slug })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const workspace = await WorkspaceModel.create({ name, slug, websiteUrl, ownerId: req.userId });
  await MembershipModel.create({ userId: req.userId, workspaceId: workspace._id, role: 'owner' });

  // The workspace exists either way — a mail failure must not undo it, so the
  // welcome is sent on a best-effort basis and only logged if it fails.
  if (mailConfigured()) {
    const user = await UserModel.findById(req.userId);
    if (user) {
      sendWelcomeEmail({ email: user.email, name: user.name }, workspace.name).catch((err) =>
        console.error('welcome email failed', err)
      );
    }
  }

  res.status(201).json(toResponse(workspace));
};

export const listWorkspaces: RequestHandler = async (req, res) => {
  const memberships = await MembershipModel.find({ userId: req.userId });
  const workspaces = await WorkspaceModel.find({ _id: { $in: memberships.map((m) => m.workspaceId) } });
  res.json(workspaces.map(toResponse));
};

function toResponse(workspace: { _id: unknown; name: string; slug: string; websiteUrl?: string }) {
  return {
    id: String(workspace._id),
    name: workspace.name,
    slug: workspace.slug,
    websiteUrl: workspace.websiteUrl ?? '',
  };
}
