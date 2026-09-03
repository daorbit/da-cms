import { Schema, model, type InferSchemaType } from 'mongoose';
import { WORKSPACE_ROLES } from './membership.model.js';

/**
 * A pending workspace invitation. Created when an admin invites an email that
 * has not joined yet; consumed (via `acceptedAt`) when that person signs in
 * and accepts through the emailed link.
 */
const inviteSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    // 'owner' is intentionally allowed by the enum but rejected at the API —
    // ownership transfers are a separate action, not an invite.
    role: { type: String, enum: WORKSPACE_ROLES, default: 'editor' },
    token: { type: String, required: true, unique: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One live invite per email per workspace; a re-invite updates the existing row.
inviteSchema.index({ workspaceId: 1, email: 1 }, { unique: true });

export type Invite = InferSchemaType<typeof inviteSchema> & { _id: Schema.Types.ObjectId };
export const InviteModel = model('Invite', inviteSchema);
