import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Workspace roles, most to least privileged:
 *  - owner  — the one account that can delete the workspace; exactly one.
 *  - admin  — manage members and workspace settings; cannot delete.
 *  - editor — content only.
 */
export const WORKSPACE_ROLES = ['owner', 'admin', 'editor'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

const membershipSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    role: { type: String, enum: WORKSPACE_ROLES, default: 'editor' },
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });

export type Membership = InferSchemaType<typeof membershipSchema> & { _id: Schema.Types.ObjectId };
export const MembershipModel = model('Membership', membershipSchema);
