import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Workspace roles, most to least privileged:
 *  - owner  — the one account that can delete the workspace; exactly one.
 *  - admin  — manage members and workspace settings; cannot delete.
 *  - editor — content only.
 */
export const WORKSPACE_ROLES = ['owner', 'admin', 'editor'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/**
 * A membership is also the invite record: an invited person gets a `pending`
 * row carrying a token and the address it was sent to. Accepting flips it to
 * `active`; declining deletes it.
 */
const membershipSchema = new Schema(
  {
    // Null while the invite is pending and the invited email has no account yet.
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    role: { type: String, enum: WORKSPACE_ROLES, default: 'editor' },

    status: { type: String, enum: ['active', 'pending'], default: 'active' },
    invitedEmail: { type: String, lowercase: true, trim: true, default: '' },
    invitedName: { type: String, trim: true, default: '' },
    inviteToken: { type: String, default: null },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    invitedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A user is in a workspace at most once (pending rows have userId null so they
// don't collide on this).
membershipSchema.index(
  { userId: 1, workspaceId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } }
);
// One pending invite per address per workspace.
membershipSchema.index(
  { workspaceId: 1, invitedEmail: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);
membershipSchema.index({ inviteToken: 1 }, { sparse: true });

export type Membership = InferSchemaType<typeof membershipSchema> & { _id: Schema.Types.ObjectId };
export const MembershipModel = model('Membership', membershipSchema);
