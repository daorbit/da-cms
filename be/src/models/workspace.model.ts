import { Schema, model, type InferSchemaType } from 'mongoose';

/** A page group or tag stored in workspace settings. Pages reference it by
 *  `name`. */
const termSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, trim: true, default: '' },
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
 * Everything the Settings screen edits lives in this sub-object, replaced a
 * whole array at a time — the page taxonomy under `configuration`, plus the
 * published site's nav links.
 */
const settingsSchema = new Schema(
  {
    configuration: {
      groups: { type: [termSchema], default: [] },
      tags: { type: [termSchema], default: [] },
    },
    siteLinks: { type: [siteLinkSchema], default: [] },
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

    settings: { type: settingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export type Workspace = InferSchemaType<typeof workspaceSchema> & { _id: Schema.Types.ObjectId };
export const WorkspaceModel = model('Workspace', workspaceSchema);
