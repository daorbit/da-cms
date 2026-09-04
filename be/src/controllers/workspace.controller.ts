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

  res.status(201).json(toResponse(workspace, 'owner'));
};

export const listWorkspaces: RequestHandler = async (req, res) => {
  const memberships = await MembershipModel.find({ userId: req.userId, status: 'active' });
  const workspaces = await WorkspaceModel.find({ _id: { $in: memberships.map((m) => m.workspaceId) } });
  // The caller's role travels with each workspace so the UI can hide admin-only
  // controls without a follow-up request.
  const roleByWorkspace = new Map(memberships.map((m) => [String(m.workspaceId), m.role]));
  res.json(workspaces.map((w) => toResponse(w, roleByWorkspace.get(String(w._id)))));
};

export const getWorkspace: RequestHandler = async (req, res) => {
  const { workspaceId } = req.params;
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    const body: ApiError = { error: 'not_found', message: 'Workspace not found' };
    res.status(404).json(body);
    return;
  }
  res.json(toResponse(workspace, req.workspaceRole));
};

const updateWorkspaceSchema = z
  .object({
    name: z.string().min(1).max(80),
    websiteUrl: z.union([z.string().url(), z.literal('')]),
  })
  .partial();

export const updateWorkspace: RequestHandler = async (req, res) => {
  const parsed = updateWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const workspace = await WorkspaceModel.findByIdAndUpdate(
    req.params.workspaceId,
    { ...parsed.data },
    { new: true }
  );
  if (!workspace) {
    const body: ApiError = { error: 'not_found', message: 'Workspace not found' };
    res.status(404).json(body);
    return;
  }
  res.json(toResponse(workspace, req.workspaceRole));
};

/* ----------------------------------------------------------------- settings */

const termSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().max(20).optional(),
});
const siteLinkSchema = z.object({
  label: z.string().min(1).max(60),
  url: z.string().min(1).max(2048),
  order: z.number().int().nonnegative().optional(),
});

/** Each key is replaced wholesale — the client sends the full array it wants. */
const updateSettingsSchema = z
  .object({
    configuration: z
      .object({
        groups: z.array(termSchema).min(1).max(50),
        tags: z.array(termSchema).max(200),
      })
      .partial(),
    siteLinks: z.array(siteLinkSchema).max(50),
  })
  .partial();

/** GET /workspaces/:workspaceId/settings */
export const getSettings: RequestHandler = async (req, res) => {
  const workspace = await WorkspaceModel.findById(req.params.workspaceId);
  if (!workspace) {
    const body: ApiError = { error: 'not_found', message: 'Workspace not found' };
    res.status(404).json(body);
    return;
  }
  res.json(settingsResponse(workspace));
};

/** PATCH /workspaces/:workspaceId/settings — owner/admin (gated on the route). */
export const updateSettings: RequestHandler = async (req, res) => {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const workspace = await WorkspaceModel.findById(req.params.workspaceId);
  if (!workspace) {
    const body: ApiError = { error: 'not_found', message: 'Workspace not found' };
    res.status(404).json(body);
    return;
  }

  const dedupe = (terms: { name: string }[]) => {
    const seen = new Set<string>();
    return terms.filter((t) => {
      const key = t.name.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  if (parsed.data.configuration?.groups) {
    workspace.set('settings.configuration.groups', dedupe(parsed.data.configuration.groups));
  }
  if (parsed.data.configuration?.tags) {
    workspace.set('settings.configuration.tags', dedupe(parsed.data.configuration.tags));
  }
  if (parsed.data.siteLinks) {
    workspace.set(
      'settings.siteLinks',
      parsed.data.siteLinks
        .map((l, i) => ({ label: l.label, url: l.url, order: l.order ?? i }))
        .sort((a, b) => a.order - b.order)
    );
  }

  await workspace.save();
  res.json(settingsResponse(workspace));
};

interface Term {
  name: string;
  color?: string;
}

/* Loose shapes — the callers pass Mongoose documents, whose subdocument types
 * don't line up with plain interfaces. */
/* eslint-disable @typescript-eslint/no-explicit-any */

function settingsResponse(w: any) {
  const cfg = w?.settings?.configuration ?? {};
  const term = (t: Term) => ({
    name: t.name,
    color: t.color ?? '',
  });
  return {
    configuration: {
      groups: ((cfg.groups ?? []) as Term[]).map(term),
      tags: ((cfg.tags ?? []) as Term[]).map(term),
    },
    siteLinks: ((w?.settings?.siteLinks ?? []) as { label: string; url: string; order: number }[])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(({ label, url, order }) => ({ label, url, order })),
  };
}

function toResponse(workspace: any, role?: string) {
  return {
    id: String(workspace._id),
    name: workspace.name,
    slug: workspace.slug,
    websiteUrl: workspace.websiteUrl ?? '',
    role: role ?? null,
  };
}
