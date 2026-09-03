import type { RequestHandler } from 'express';
import { z } from 'zod';
import { WorkspaceSettingsModel } from '../models/workspace-settings.model.js';
import { slugify } from '../lib/slugify.js';
import type { ApiError } from '../types/index.js';

interface SettingsDoc {
  _id: unknown;
  pageGroups: { name: string; slug: string }[];
  pageTags: { name: string; slug: string }[];
  siteLinks: { label: string; url: string; order: number }[];
}

function toResponse(s: SettingsDoc) {
  return {
    pageGroups: s.pageGroups.map(({ name, slug }) => ({ name, slug })),
    pageTags: s.pageTags.map(({ name, slug }) => ({ name, slug })),
    siteLinks: s.siteLinks
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(({ label, url, order }) => ({ label, url, order })),
  };
}

/** Lazily create the settings row so the first read never 404s. */
async function loadOrCreate(workspaceId: string) {
  const existing = await WorkspaceSettingsModel.findOne({ workspaceId });
  if (existing) return existing;
  return WorkspaceSettingsModel.create({ workspaceId });
}

/** GET /workspaces/:workspaceId/settings */
export const getSettings: RequestHandler = async (req, res) => {
  const settings = await loadOrCreate(req.params.workspaceId);
  res.json(toResponse(settings as unknown as SettingsDoc));
};

/**
 * Terms come in as a bare list of names; the slug is derived and de-duplicated
 * here so the client never has to.
 */
function normaliseTerms(names: string[]) {
  const seen = new Set<string>();
  const out: { name: string; slug: string }[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const slug = slugify(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ name, slug });
  }
  return out;
}

const siteLinkSchema = z.object({
  label: z.string().min(1).max(60),
  url: z.string().min(1).max(2048),
  order: z.number().int().nonnegative().optional(),
});

const updateSchema = z
  .object({
    pageGroups: z.array(z.string().min(1).max(40)).min(1).max(50),
    pageTags: z.array(z.string().min(1).max(40)).max(200),
    siteLinks: z.array(siteLinkSchema).max(50),
  })
  .partial();

/** PATCH /workspaces/:workspaceId/settings — owner/admin only (gated on the route). */
export const updateSettings: RequestHandler = async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const settings = await loadOrCreate(req.params.workspaceId);

  if (parsed.data.pageGroups) settings.set('pageGroups', normaliseTerms(parsed.data.pageGroups));
  if (parsed.data.pageTags) settings.set('pageTags', normaliseTerms(parsed.data.pageTags));
  if (parsed.data.siteLinks) {
    settings.set(
      'siteLinks',
      parsed.data.siteLinks
        .map((l, i) => ({ label: l.label, url: l.url, order: l.order ?? i }))
        .sort((a, b) => a.order - b.order)
    );
  }

  await settings.save();
  res.json(toResponse(settings as unknown as SettingsDoc));
};
