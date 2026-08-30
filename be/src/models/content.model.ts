import { Schema, model, type InferSchemaType } from 'mongoose';

const contentSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    collectionId: { type: Schema.Types.ObjectId, ref: 'Collection', required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  },
  { timestamps: true }
);

contentSchema.index({ workspaceId: 1, collectionId: 1 });

export type Content = InferSchemaType<typeof contentSchema> & { _id: Schema.Types.ObjectId };
export const ContentModel = model('Content', contentSchema);
