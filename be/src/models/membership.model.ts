import { Schema, model, type InferSchemaType } from 'mongoose';

const membershipSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    role: { type: String, enum: ['owner'], default: 'owner' },
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });

export type Membership = InferSchemaType<typeof membershipSchema> & { _id: Schema.Types.ObjectId };
export const MembershipModel = model('Membership', membershipSchema);
