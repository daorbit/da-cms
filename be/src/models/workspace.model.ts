import { Schema, model, type InferSchemaType } from 'mongoose';

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export type Workspace = InferSchemaType<typeof workspaceSchema> & { _id: Schema.Types.ObjectId };
export const WorkspaceModel = model('Workspace', workspaceSchema);
