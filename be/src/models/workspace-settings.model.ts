import { Schema, model, type InferSchemaType } from 'mongoose';

/** Groups and tags a new workspace starts with. */
export const DEFAULT_PAGE_GROUPS = ['General', 'Blog', 'Case study'] as const;

/** A named page group or tag. `slug` is what pages store and what the published
 *  site routes on; `name` is the label shown in the UI. */
const termSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
  },
  { _id: false }
);

/** One entry in the published site's navigation, ordered by `order`. */
const siteLinkSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Per-workspace configuration that is edited in the Settings module rather than
 * on the workspace record itself: the page taxonomy (groups + tags) and the
 * published site's nav links. One document per workspace, created lazily on
 * first read.
 */
const workspaceSettingsSchema = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      unique: true,
    },
    pageGroups: {
      type: [termSchema],
      default: () => DEFAULT_PAGE_GROUPS.map((name) => ({ name, slug: name.toLowerCase().replace(/\s+/g, '-') })),
    },
    pageTags: { type: [termSchema], default: [] },
    siteLinks: { type: [siteLinkSchema], default: [] },
  },
  { timestamps: true }
);

export type WorkspaceSettings = InferSchemaType<typeof workspaceSettingsSchema> & {
  _id: Schema.Types.ObjectId;
};
export const WorkspaceSettingsModel = model('WorkspaceSettings', workspaceSettingsSchema);
