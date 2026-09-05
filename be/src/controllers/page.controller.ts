import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { PageModel, SECTION_TYPES } from '../models/page.model.js';
import { WorkspaceModel } from '../models/workspace.model.js';
import { slugify } from '../lib/slugify.js';
import { editorStyles } from '../lib/editor-styles.js';
import type { ApiError } from '../types/index.js';

/** The group/tag names a workspace currently allows, from its settings blob. */
async function allowedTaxonomy(workspaceId: string) {
  const workspace = await WorkspaceModel.findById(workspaceId).select('settings');
  const cfg = workspace?.settings?.configuration;
  return {
    groups: (cfg?.groups ?? []).map((g) => g.name),
    tags: (cfg?.tags ?? []).map((t) => t.name),
  };
}

const sectionSchema = z.object({
  key: z.string().min(1),
  type: z.enum(SECTION_TYPES),
  data: z.record(z.string(), z.unknown()).default({}),
});

const imageSchema = z.object({
  url: z.string().default(''),
  alt: z.string().default(''),
});

const pageSchema = z.object({
  title: z.string().min(1, 'A title is required').max(200),
  slug: z.string().optional(),
  description: z.string().max(500).default(''),
  /** A group name from workspace settings, or '' when none is set. Validated
   *  against the live list. */
  group: z.string().max(60).default(''),
  tags: z.array(z.string().min(1).max(60)).max(50).default([]),
  heroImage: imageSchema.default({ url: '', alt: '' }),
  thumbnailImage: imageSchema.default({ url: '', alt: '' }),
  content: z.string().default(''),
  sections: z.array(sectionSchema).default([]),
  seo: z
    .object({
      title: z.string().default(''),
      description: z.string().default(''),
      ogImage: z.string().default(''),
      noIndex: z.boolean().default(false),
    })
    .default({ title: '', description: '', ogImage: '', noIndex: false }),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

/** A populated author, or null once the user has been removed. */
type AuthorRef = { _id: unknown; name?: string; email?: string } | null | undefined;

function toAuthor(value: AuthorRef) {
  if (!value) return null;
  // Unpopulated it is still a bare ObjectId — return just the id rather than an
  // object with undefined name/email that the UI would render as blank.
  if (typeof value !== 'object' || !('name' in value)) return { id: String(value), name: null };
  return { id: String(value._id), name: value.name ?? null, email: value.email ?? null };
}

interface PageDoc {
  _id: unknown;
  title: string;
  slug: string;
  description?: string;
  group?: string;
  tags?: string[];
  heroImage?: unknown;
  thumbnailImage?: unknown;
  content?: string;
  sections: unknown;
  seo: unknown;
  status: string;
  publishedAt?: Date | null;
  createdBy?: AuthorRef;
  updatedBy?: AuthorRef;
  createdAt?: Date;
  updatedAt?: Date;
}

function toResponse(page: PageDoc) {
  return {
    id: String(page._id),
    title: page.title,
    slug: page.slug,
    description: page.description ?? '',
    group: page.group ?? '',
    tags: page.tags ?? [],
    heroImage: page.heroImage ?? { url: '', alt: '' },
    thumbnailImage: page.thumbnailImage ?? { url: '', alt: '' },
    content: page.content ?? '',
    sections: page.sections,
    seo: page.seo,
    status: page.status,
    publishedAt: page.publishedAt ?? null,
    createdBy: toAuthor(page.createdBy),
    updatedBy: toAuthor(page.updatedBy),
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

const AUTHOR_FIELDS = 'name email';

/** Returns an error message if `group`/`tags` are not in the workspace's
 *  configured taxonomy, or null if they check out. */
async function checkTaxonomy(workspaceId: string, group?: string, tags?: string[]) {
  if (group === undefined && tags === undefined) return null;
  const allowed = await allowedTaxonomy(workspaceId);
  // '' means "no group" — always allowed, e.g. before any group is defined.
  if (group !== undefined && group !== '' && !allowed.groups.includes(group)) {
    return `"${group}" is not a group in this workspace`;
  }
  if (tags?.length) {
    const unknown = tags.find((t) => !allowed.tags.includes(t));
    if (unknown) return `"${unknown}" is not a tag in this workspace`;
  }
  return null;
}

const duplicateSlug = (err: unknown) =>
  typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;

export const createPage: RequestHandler = async (req, res) => {
  const parsed = pageSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { title, status, ...rest } = parsed.data;
  const { workspaceId } = req.params;
  const slug = slugify(parsed.data.slug || title);

  const taxonomyError = await checkTaxonomy(workspaceId, rest.group, rest.tags);
  if (taxonomyError) {
    const body: ApiError = { error: 'invalid_input', message: taxonomyError };
    res.status(400).json(body);
    return;
  }

  try {
    const page = await PageModel.create({
      ...rest,
      workspaceId,
      title,
      slug,
      status,
      // Stamped on the way in rather than by a hook, so an imported page can
      // carry its original publish date instead of being stamped with today's.
      publishedAt: status === 'published' ? new Date() : null,
      createdBy: req.userId,
      updatedBy: req.userId,
    });

    await page.populate([
      { path: 'createdBy', select: AUTHOR_FIELDS },
      { path: 'updatedBy', select: AUTHOR_FIELDS },
    ]);
    res.status(201).json(toResponse(page));
  } catch (err) {
    if (!duplicateSlug(err)) throw err;
    const body: ApiError = { error: 'slug_taken', message: `A page with slug "${slug}" already exists` };
    res.status(409).json(body);
  }
};

export const listPages: RequestHandler = async (req, res) => {
  const { workspaceId } = req.params;
  const { status, q } = req.query;

  const { group, tag } = req.query;

  const filter: Record<string, unknown> = { workspaceId };
  if (status === 'draft' || status === 'published' || status === 'archived') filter.status = status;
  if (typeof group === 'string' && group.trim()) filter.group = group.trim();
  if (typeof tag === 'string' && tag.trim()) filter.tags = tag.trim();
  if (typeof q === 'string' && q.trim()) {
    // Escaped so a stray "(" in the search box cannot throw an invalid-regex error.
    const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { slug: { $regex: safe, $options: 'i' } },
    ];
  }

  // Page is 1-based; perPage is clamped so a caller cannot ask for the lot.
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const perPageRaw = Number.parseInt(String(req.query.perPage ?? '20'), 10) || 20;
  const perPage = Math.min(100, Math.max(1, perPageRaw));

  const [items, total] = await Promise.all([
    PageModel.find(filter)
      // The list shows neither the content nor the blocks, and a page full of
      // rich text is by far the heaviest field — excluded so the table stays cheap.
      .select('-content -sections')
      .populate('createdBy', AUTHOR_FIELDS)
      .populate('updatedBy', AUTHOR_FIELDS)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage),
    PageModel.countDocuments(filter),
  ]);

  res.json({
    items: items.map((doc) => toResponse(doc as unknown as PageDoc)),
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  });
};

export const getPage: RequestHandler = async (req, res) => {
  const { workspaceId, id } = req.params;
  const page = await PageModel.findOne({ _id: id, workspaceId })
    .populate('createdBy', AUTHOR_FIELDS)
    .populate('updatedBy', AUTHOR_FIELDS);

  if (!page) {
    const body: ApiError = { error: 'not_found', message: 'Page not found' };
    res.status(404).json(body);
    return;
  }
  res.json(toResponse(page as unknown as PageDoc));
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The whitelist a `?fields=` value can pull from — everything a public
 *  consumer is allowed to read. Author/internal fields are not on it. */
const PUBLIC_FIELDS = [
  'id',
  'title',
  'slug',
  'description',
  'group',
  'tags',
  'heroImage',
  'thumbnailImage',
  'content',
  'seo',
  'status',
  'publishedAt',
  'updatedAt',
] as const;

type PublicField = (typeof PUBLIC_FIELDS)[number];

function publicResponse(page: PageDoc): Record<string, unknown> {
  return {
    id: String(page._id),
    title: page.title,
    slug: page.slug,
    description: page.description ?? '',
    group: page.group ?? '',
    tags: page.tags ?? [],
    heroImage: page.heroImage ?? { url: '', alt: '' },
    thumbnailImage: page.thumbnailImage ?? { url: '', alt: '' },
    content: page.content ?? '',
    seo: page.seo,
    status: page.status,
    publishedAt: page.publishedAt ?? null,
    updatedAt: page.updatedAt,
  };
}

/** `?fields=title,content` → ['title','content'], dropping anything not public. */
function parseFields(raw: unknown): PublicField[] | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const set = new Set(PUBLIC_FIELDS as readonly string[]);
  const picked = raw
    .split(',')
    .map((f) => f.trim())
    .filter((f) => set.has(f)) as PublicField[];
  return picked.length ? picked : null;
}

function contentDocument(title: string, content: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${editorStyles}</style>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; background: var(--da-bg, #fff); }
  /* The editor's own frame belongs to the editing UI, not to a published
     page, so the reader gets the block styles without the box around them. */
  .da-editor { border: none; border-radius: 0; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
  <div class="da-editor da-editor--readonly wrap">
    ${content}
  </div>
  <script>
    // The stylesheet keys dark mode off a data attribute rather than a media
    // query, so mirror the reader's OS preference onto the wrapper.
    (function () {
      var el = document.querySelector('.da-editor');
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var sync = function () { el.setAttribute('data-theme', mq.matches ? 'dark' : 'light'); };
      sync();
      mq.addEventListener('change', sync);
    })();
  </script>
</body>
</html>`;
}

/**
 * Public read of one published page by slug — no auth.
 *
 * This is the content API an external site calls to render a page it owns in
 * this CMS. `?fields=title,content,slug` narrows the JSON to just those keys;
 * `?format=html` returns the content as a standalone document instead (what
 * the editor's preview frames).
 */
export const getPublicPageBySlug: RequestHandler = async (req, res) => {
  const { workspaceId, slug } = req.params;
  const page = await PageModel.findOne({ workspaceId, slug, status: 'published' }).select(
    '-sections -createdBy -updatedBy'
  );

  if (!page) {
    if (req.query.format === 'html') {
      res.status(404).send('<!doctype html><title>Not found</title><p>Page not found.</p>');
      return;
    }
    const body: ApiError = { error: 'not_found', message: 'Page not found' };
    res.status(404).json(body);
    return;
  }

  const full = publicResponse(page as unknown as PageDoc);

  if (req.query.format === 'html') {
    res.type('html').send(contentDocument(String(full.title), String(full.content ?? '')));
    return;
  }

  const fields = parseFields(req.query.fields);
  const payload = fields
    ? Object.fromEntries(fields.map((f) => [f, full[f]]))
    : full;

  res.json(payload);
};

export const updatePage: RequestHandler = async (req, res) => {
  const parsed = pageSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { workspaceId, id } = req.params;
  const existing = await PageModel.findOne({ _id: id, workspaceId });
  if (!existing) {
    const body: ApiError = { error: 'not_found', message: 'Page not found' };
    res.status(404).json(body);
    return;
  }

  const taxonomyError = await checkTaxonomy(workspaceId, parsed.data.group, parsed.data.tags);
  if (taxonomyError) {
    const body: ApiError = { error: 'invalid_input', message: taxonomyError };
    res.status(400).json(body);
    return;
  }

  const update: Record<string, unknown> = { ...parsed.data, updatedBy: req.userId };
  // Only re-slug on an explicit slug edit. Deriving it from the title again
  // would silently break the URL of a live page whose title got a typo fix.
  if (parsed.data.slug) update.slug = slugify(parsed.data.slug);
  // Stamp the first publish only; re-saving a published page keeps its date.
  if (parsed.data.status === 'published' && existing.status !== 'published') {
    update.publishedAt = new Date();
  }

  try {
    const page = await PageModel.findOneAndUpdate({ _id: id, workspaceId }, update, { new: true })
      .populate('createdBy', AUTHOR_FIELDS)
      .populate('updatedBy', AUTHOR_FIELDS);
    res.json(toResponse(page as unknown as PageDoc));
  } catch (err) {
    if (!duplicateSlug(err)) throw err;
    const body: ApiError = { error: 'slug_taken', message: 'A page with that slug already exists' };
    res.status(409).json(body);
  }
};

export const deletePage: RequestHandler = async (req, res) => {
  const { workspaceId, id } = req.params;
  const result = await PageModel.findOneAndDelete({ _id: id, workspaceId });
  if (!result) {
    const body: ApiError = { error: 'not_found', message: 'Page not found' };
    res.status(404).json(body);
    return;
  }
  res.status(204).end();
};

const bulkSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('delete'), ids: z.array(z.string()).min(1).max(200) }),
  z.object({
    action: z.literal('status'),
    ids: z.array(z.string()).min(1).max(200),
    status: z.enum(['draft', 'published', 'archived']),
  }),
]);

/** Delete or re-status many pages of this workspace in one request. */
export const bulkPages: RequestHandler = async (req, res) => {
  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { workspaceId } = req.params;
  // Scoped to this workspace, so ids from another workspace are silently no-ops.
  const filter = { _id: { $in: parsed.data.ids }, workspaceId };

  if (parsed.data.action === 'delete') {
    const { deletedCount } = await PageModel.deleteMany(filter);
    res.json({ deleted: deletedCount });
    return;
  }

  const update: Record<string, unknown> = {
    status: parsed.data.status,
    updatedBy: req.userId,
  };
  // Stamp the first publish; leave an already-published page's date alone.
  if (parsed.data.status === 'published') {
    await PageModel.updateMany(
      { ...filter, publishedAt: null },
      { $set: { publishedAt: new Date() } }
    );
  }
  const { modifiedCount } = await PageModel.updateMany(filter, { $set: update });
  res.json({ updated: modifiedCount });
};

/** Counts backing the dashboard, in one round trip rather than three. */
export const workspaceStats: RequestHandler = async (req, res) => {
  const { workspaceId } = req.params;

  const [byStatus, recent] = await Promise.all([
    PageModel.aggregate<{ _id: string; count: number }>([
      // Aggregate bypasses Mongoose casting, so the id must be a real ObjectId
      // here — a string would silently match nothing.
      { $match: { workspaceId: Types.ObjectId.createFromHexString(workspaceId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    PageModel.find({ workspaceId })
      .select('-content -sections')
      .populate('updatedBy', AUTHOR_FIELDS)
      .sort({ updatedAt: -1 })
      .limit(5),
  ]);

  const counts = Object.fromEntries(byStatus.map((row) => [row._id, row.count]));
  const draft = counts.draft ?? 0;
  const published = counts.published ?? 0;
  const archived = counts.archived ?? 0;

  res.json({
    pages: { total: draft + published + archived, draft, published, archived },
    recent: recent.map((page) => toResponse(page as unknown as PageDoc)),
  });
};
