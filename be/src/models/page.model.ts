import { Schema, model, type InferSchemaType } from 'mongoose';

export const SECTION_TYPES = ['hero', 'richtext', 'image', 'cta', 'features'] as const;

/**
 * A page is an ordered list of typed blocks. Each block keeps its own shape in
 * `data`, so adding a section type is a frontend concern — no migration here.
 */
const sectionSchema = new Schema(
  {
    key: { type: String, required: true },
    type: { type: String, enum: SECTION_TYPES, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

/** Shared shape for the hero and thumbnail images. */
const imageSchema = new Schema(
  {
    url: { type: String, trim: true, default: '' },
    alt: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

/** A published article's byline. Free text, not a link to an account. */
const authorSchema = new Schema(
  {
    name: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

/**
 * What search engines and social cards read.
 *
 * Every field is optional and falls back to the page's own title, description
 * and hero image — a page with none of this set still has usable metadata, and
 * these exist for when the on-page copy is not the right thing to show in a
 * result or a shared link.
 */
const seoSchema = new Schema(
  {
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    ogImage: { type: String, trim: true, default: '' },
    noIndex: { type: Boolean, default: false },

    /** The one URL search engines should treat as authoritative for this page. */
    canonicalUrl: { type: String, trim: true, default: '' },
    /** Comma-separated. Ignored by Google, still read by some other engines. */
    keywords: { type: String, trim: true, default: '' },

    /** Overrides for the card a link shows when shared. */
    ogTitle: { type: String, trim: true, default: '' },
    ogDescription: { type: String, trim: true, default: '' },
    /** `article` for a post, `website` for a landing page. */
    ogType: { type: String, trim: true, default: 'article' },

    /** How large an image the card uses: 'summary_large_image' or 'summary'. */
    twitterCard: { type: String, trim: true, default: 'summary_large_image' },

    /** Excluded from sitemaps as well as from search, when set. */
    noFollow: { type: Boolean, default: false },
  },
  { _id: false }
);

const pageSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },

    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    /** Short summary used in listings and as the SEO description fallback. */
    description: { type: String, trim: true, default: '' },

    /** The group this page belongs to — a group name from
     *  `workspace.settings.configuration.groups`. Validated in the controller so
     *  the list stays editable without a migration. */
    group: { type: String, trim: true, default: '' },
    /** Tag names from `workspace.settings.configuration.tags`. */
    tags: { type: [String], default: [] },

    /** Wide banner at the top of the page. */
    heroImage: { type: imageSchema, default: () => ({}) },
    /** Square-ish card image used in listings and social previews. */
    thumbnailImage: { type: imageSchema, default: () => ({}) },

    /** TipTap HTML from the page editor. Hero/CTA/features render as blocks inline here. */
    content: { type: String, default: '' },

    /** Read-only now: sections from pages saved before those blocks moved into `content`. */
    sections: { type: [sectionSchema], default: [] },
    seo: { type: seoSchema, default: () => ({}) },

    /**
     * The byline a published article carries. Distinct from `createdBy`, which
     * is the account that saved the page — an editor may publish under someone
     * else's name, and a byline should survive that account being deleted.
     */
    author: { type: authorSchema, default: () => ({}) },
    /** Estimated read time in minutes. 0 means "work it out from the content". */
    readingMinutes: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    publishedAt: { type: Date, default: null },

    // Kept alongside Mongoose's own createdAt/updatedAt: those say when, these
    // say who. Populated for display, so a deleted user leaves a null rather
    // than breaking the page.
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

pageSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });
pageSchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });
pageSchema.index({ workspaceId: 1, group: 1, updatedAt: -1 });

export type Page = InferSchemaType<typeof pageSchema> & { _id: Schema.Types.ObjectId };
export const PageModel = model('Page', pageSchema);
