import { z } from "zod";
import { PageModel, SECTION_TYPES } from "../models/page.model.js";
import { WorkspaceModel } from "../models/workspace.model.js";
import { slugify } from "../lib/slugify.js";
import { invalidInput, notFound, ServiceError } from "../lib/service-error.js";

/** The group/tag names a workspace currently allows, from its settings blob. */
async function allowedTaxonomy(workspaceId: string) {
  const workspace =
    await WorkspaceModel.findById(workspaceId).select("settings");
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
  url: z.string().default(""),
  alt: z.string().default(""),
});

export const pageSchema = z.object({
  title: z.string().min(1, "A title is required").max(200),
  slug: z.string().optional(),
  description: z.string().max(500).default(""),
  /** A group name from workspace settings, or '' when none is set. Validated
   *  against the live list. */
  group: z.string().max(60).default(""),
  tags: z.array(z.string().min(1).max(60)).max(50).default([]),
  heroImage: imageSchema.default({ url: "", alt: "" }),
  thumbnailImage: imageSchema.default({ url: "", alt: "" }),
  content: z.string().default(""),
  sections: z.array(sectionSchema).default([]),
  seo: z
    .object({
      title: z.string().max(200).default(""),
      description: z.string().max(400).default(""),
      ogImage: z.string().default(""),
      noIndex: z.boolean().default(false),
      canonicalUrl: z.string().max(500).default(""),
      keywords: z.string().max(300).default(""),
      ogTitle: z.string().max(200).default(""),
      ogDescription: z.string().max(400).default(""),
      ogType: z.string().max(40).default("article"),
      twitterCard: z.string().max(40).default("summary_large_image"),
      noFollow: z.boolean().default(false),
    })
    .default({
      title: "",
      description: "",
      ogImage: "",
      noIndex: false,
      canonicalUrl: "",
      keywords: "",
      ogTitle: "",
      ogDescription: "",
      ogType: "article",
      twitterCard: "summary_large_image",
      noFollow: false,
    }),
  /** The byline a published article carries, separate from who saved it. */
  author: z
    .object({
      name: z.string().max(120).default(""),
      role: z.string().max(120).default(""),
    })
    .default({ name: "", role: "" }),
  /** Estimated read time. 0 lets a consumer work it out from the content. */
  readingMinutes: z.number().int().min(0).max(999).default(0),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  /** Set explicitly when importing existing content with its original date. */
  publishedAt: z.coerce.date().optional(),
});

/** A populated author, or null once the user has been removed. */
export type AuthorRef =
  | { _id: unknown; name?: string; email?: string }
  | null
  | undefined;

export function toAuthor(value: AuthorRef) {
  if (!value) return null;
  // Unpopulated it is still a bare ObjectId — return just the id rather than an
  // object with undefined name/email that the UI would render as blank.
  if (typeof value !== "object" || !("name" in value))
    return { id: String(value), name: null };
  return {
    id: String(value._id),
    name: value.name ?? null,
    email: value.email ?? null,
  };
}

export interface PageDoc {
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
  author?: { name?: string; role?: string };
  readingMinutes?: number;
  status: string;
  publishedAt?: Date | null;
  createdBy?: AuthorRef;
  updatedBy?: AuthorRef;
  createdAt?: Date;
  updatedAt?: Date;
}

export function toResponse(page: PageDoc) {
  return {
    id: String(page._id),
    title: page.title,
    slug: page.slug,
    description: page.description ?? "",
    group: page.group ?? "",
    tags: page.tags ?? [],
    heroImage: page.heroImage ?? { url: "", alt: "" },
    thumbnailImage: page.thumbnailImage ?? { url: "", alt: "" },
    content: page.content ?? "",
    sections: page.sections,
    seo: page.seo,
    author: page.author ?? { name: "", role: "" },
    readingMinutes: page.readingMinutes ?? 0,
    status: page.status,
    publishedAt: page.publishedAt ?? null,
    createdBy: toAuthor(page.createdBy),
    updatedBy: toAuthor(page.updatedBy),
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

export type PageResponse = ReturnType<typeof toResponse>;

export const AUTHOR_FIELDS = "name email";

/** Rejects `group`/`tags` that are not in the workspace's configured taxonomy. */
async function checkTaxonomy(
  workspaceId: string,
  group?: string,
  tags?: string[],
) {
  if (group === undefined && tags === undefined) return;
  const allowed = await allowedTaxonomy(workspaceId);
  // '' means "no group" — always allowed, e.g. before any group is defined.
  if (group !== undefined && group !== "" && !allowed.groups.includes(group)) {
    throw invalidInput(`"${group}" is not a group in this workspace`);
  }
  if (tags?.length) {
    const unknown = tags.find((t) => !allowed.tags.includes(t));
    if (unknown) throw invalidInput(`"${unknown}" is not a tag in this workspace`);
  }
}

type PageSeo = z.infer<typeof pageSchema>["seo"];

/** Seeds empty search and social text from the page's title and description. */
function withSeoDefaults(
  seo: PageSeo,
  title: string,
  description: string,
): PageSeo {
  const seoTitle = seo.title || title.slice(0, 200);
  const seoDescription = seo.description || description.slice(0, 400);
  return {
    ...seo,
    title: seoTitle,
    description: seoDescription,
    ogTitle: seo.ogTitle || seoTitle,
    ogDescription: seo.ogDescription || seoDescription,
  };
}

const duplicateSlug = (err: unknown) =>
  typeof err === "object" &&
  err !== null &&
  (err as { code?: number }).code === 11000;

const slugTaken = (message: string) => new ServiceError(409, "slug_taken", message);

function parseInput<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw invalidInput(parsed.error.issues[0].message);
  return parsed.data;
}

export async function createPage(
  workspaceId: string,
  userId: string | undefined,
  input: unknown,
): Promise<PageResponse> {
  const data = parseInput(pageSchema, input);
  const { title, status, ...rest } = data;
  const slug = slugify(data.slug || title);
  rest.seo = withSeoDefaults(rest.seo, title, rest.description);

  await checkTaxonomy(workspaceId, rest.group, rest.tags);

  try {
    const page = await PageModel.create({
      ...rest,
      workspaceId,
      title,
      slug,
      status,

      publishedAt:
        status === "published" ? (data.publishedAt ?? new Date()) : null,
      createdBy: userId,
      updatedBy: userId,
    });

    await page.populate([
      { path: "createdBy", select: AUTHOR_FIELDS },
      { path: "updatedBy", select: AUTHOR_FIELDS },
    ]);
    return toResponse(page);
  } catch (err) {
    if (!duplicateSlug(err)) throw err;
    throw slugTaken(`A page with slug "${slug}" already exists`);
  }
}

export interface PageListQuery {
  status?: unknown;
  q?: unknown;
  group?: unknown;
  tag?: unknown;
  page?: unknown;
  perPage?: unknown;
}

export async function listPages(workspaceId: string, query: PageListQuery) {
  const { status, q, group, tag } = query;

  const filter: Record<string, unknown> = { workspaceId };
  if (status === "draft" || status === "published" || status === "archived")
    filter.status = status;
  if (typeof group === "string" && group.trim()) filter.group = group.trim();
  if (typeof tag === "string" && tag.trim()) filter.tags = tag.trim();
  if (typeof q === "string" && q.trim()) {
    // Escaped so a stray "(" in the search box cannot throw an invalid-regex error.
    const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: safe, $options: "i" } },
      { slug: { $regex: safe, $options: "i" } },
    ];
  }

  // Page is 1-based; perPage is clamped so a caller cannot ask for the lot.
  const page = Math.max(
    1,
    Number.parseInt(String(query.page ?? "1"), 10) || 1,
  );
  const perPageRaw =
    Number.parseInt(String(query.perPage ?? "20"), 10) || 20;
  const perPage = Math.min(100, Math.max(1, perPageRaw));

  const [items, total] = await Promise.all([
    PageModel.find(filter)
      // The list shows neither the content nor the blocks, and a page full of
      // rich text is by far the heaviest field — excluded so the table stays cheap.
      .select("-content -sections")
      .populate("createdBy", AUTHOR_FIELDS)
      .populate("updatedBy", AUTHOR_FIELDS)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage),
    PageModel.countDocuments(filter),
  ]);

  return {
    items: items.map((doc) => toResponse(doc as unknown as PageDoc)),
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getPage(workspaceId: string, id: string): Promise<PageResponse> {
  const page = await PageModel.findOne({ _id: id, workspaceId })
    .populate("createdBy", AUTHOR_FIELDS)
    .populate("updatedBy", AUTHOR_FIELDS);

  if (!page) throw notFound("Page not found");
  return toResponse(page as unknown as PageDoc);
}

export async function updatePage(
  workspaceId: string,
  id: string,
  userId: string | undefined,
  input: unknown,
): Promise<PageResponse> {
  const data = parseInput(pageSchema.partial(), input);

  const existing = await PageModel.findOne({ _id: id, workspaceId });
  if (!existing) throw notFound("Page not found");

  // Version history is switched off for now — nothing is snapshotted, so no
  // revisions accumulate. Re-enable by restoring this call and the routes.
  // await snapshotRevision(existing as unknown as PageDoc, workspaceId, userId);

  await checkTaxonomy(workspaceId, data.group, data.tags);

  const update: Record<string, unknown> = {
    ...data,
    updatedBy: userId,
  };
  // Only re-slug on an explicit slug edit. Deriving it from the title again
  // would silently break the URL of a live page whose title got a typo fix.
  if (data.slug) update.slug = slugify(data.slug);
  // Stamp the first publish only; re-saving a published page keeps its date.
  if (data.status === "published" && existing.status !== "published") {
    update.publishedAt = data.publishedAt ?? new Date();
  }

  try {
    const page = await PageModel.findOneAndUpdate(
      { _id: id, workspaceId },
      update,
      { new: true },
    )
      .populate("createdBy", AUTHOR_FIELDS)
      .populate("updatedBy", AUTHOR_FIELDS);
    return toResponse(page as unknown as PageDoc);
  } catch (err) {
    if (!duplicateSlug(err)) throw err;
    throw slugTaken("A page with that slug already exists");
  }
}
