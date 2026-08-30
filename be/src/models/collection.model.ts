import { Schema, model, type InferSchemaType } from 'mongoose';

const fieldSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['text', 'richtext', 'number', 'boolean', 'date', 'image'],
      required: true,
    },
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

const collectionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    fields: { type: [fieldSchema], default: [] },
  },
  { timestamps: true }
);

collectionSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });

export type Collection = InferSchemaType<typeof collectionSchema> & { _id: Schema.Types.ObjectId };
export const CollectionModel = model('Collection', collectionSchema);
