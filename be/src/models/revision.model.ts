import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * A page as it was at one point in time.
 *
 * Written before each save rather than after, so a revision is always the state
 * that is about to be replaced — which is what someone restoring wants: the
 * version from before the edit that broke it.
 *
 * Only the fields a writer edits are kept. Status and publish dates are
 * deliberately excluded: restoring old content should not also un-publish a
 * live page or rewrite its publication date.
 */
const revisionSchema = new Schema(
  {
    pageId: { type: Schema.Types.ObjectId, ref: 'Page', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },

    title: { type: String, default: '' },
    slug: { type: String, default: '' },
    description: { type: String, default: '' },
    group: { type: String, default: '' },
    tags: { type: [String], default: [] },
    heroImage: { type: Schema.Types.Mixed, default: {} },
    thumbnailImage: { type: Schema.Types.Mixed, default: {} },
    content: { type: String, default: '' },
    seo: { type: Schema.Types.Mixed, default: {} },
    author: { type: Schema.Types.Mixed, default: {} },
    readingMinutes: { type: Number, default: 0 },

    /** Who made the edit this revision was taken before. */
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// The history of one page, newest first — the only way this is ever read.
revisionSchema.index({ pageId: 1, createdAt: -1 });

export type Revision = InferSchemaType<typeof revisionSchema> & { _id: Schema.Types.ObjectId };
export const RevisionModel = model('Revision', revisionSchema);
