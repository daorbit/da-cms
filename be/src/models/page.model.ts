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

const seoSchema = new Schema(
  {
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    ogImage: { type: String, trim: true, default: '' },
    noIndex: { type: Boolean, default: false },
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
