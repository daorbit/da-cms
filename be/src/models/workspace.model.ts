import { Schema, model, type InferSchemaType } from 'mongoose';

/** Groups every workspace starts with — pages must belong to one of these or
 *  any the workspace adds later. */
export const DEFAULT_PAGE_GROUPS = ['General', 'Blog', 'Case study'] as const;

/** One entry in the published site's navigation, ordered by `order`. */
const siteLinkSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    /** The site this workspace publishes to. Optional — set during onboarding. */
    websiteUrl: { type: String, trim: true, default: '' },

    /** The allowed values for a page's `group`. Editable in workspace settings. */
    pageGroups: { type: [String], default: () => [...DEFAULT_PAGE_GROUPS] },

    /** Navigation links for the published site, user-managed. */
    siteLinks: { type: [siteLinkSchema], default: [] },
  },
  { timestamps: true }
);

export type Workspace = InferSchemaType<typeof workspaceSchema> & { _id: Schema.Types.ObjectId };
export const WorkspaceModel = model('Workspace', workspaceSchema);
