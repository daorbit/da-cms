import type { RequestHandler } from 'express';
import { InviteModel } from '../models/invite.model.js';
import { MembershipModel } from '../models/membership.model.js';
import { WorkspaceModel } from '../models/workspace.model.js';
import { UserModel } from '../models/user.model.js';
import type { ApiError } from '../types/index.js';

/** GET /invites/:token — preview an invite before signing in / accepting. Public. */
export const getInvite: RequestHandler = async (req, res) => {
  const invite = await InviteModel.findOne({ token: req.params.token });
  if (!invite || invite.acceptedAt) {
    const body: ApiError = { error: 'not_found', message: 'This invite is no longer valid' };
    res.status(404).json(body);
    return;
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    const body: ApiError = { error: 'expired', message: 'This invite has expired' };
    res.status(410).json(body);
    return;
  }

  const workspace = await WorkspaceModel.findById(invite.workspaceId);
  res.json({
    email: invite.email,
    role: invite.role,
    workspace: workspace ? { name: workspace.name, slug: workspace.slug } : null,
  });
};

/**
 * POST /invites/:token/accept — requires an authenticated session. The signed-in
 * user's email must match the invited address.
 */
export const acceptInvite: RequestHandler = async (req, res) => {
  const invite = await InviteModel.findOne({ token: req.params.token });
  if (!invite || invite.acceptedAt) {
    const body: ApiError = { error: 'not_found', message: 'This invite is no longer valid' };
    res.status(404).json(body);
    return;
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    const body: ApiError = { error: 'expired', message: 'This invite has expired' };
    res.status(410).json(body);
    return;
  }

  const user = await UserModel.findById(req.userId);
  if (!user) {
    const body: ApiError = { error: 'unauthorized', message: 'Not signed in' };
    res.status(401).json(body);
    return;
  }
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    const body: ApiError = {
      error: 'email_mismatch',
      message: `This invite is for ${invite.email}. Sign in with that address to accept.`,
    };
    res.status(403).json(body);
    return;
  }

  // Idempotent: if they somehow already joined, just mark the invite consumed.
  await MembershipModel.findOneAndUpdate(
    { userId: user._id, workspaceId: invite.workspaceId },
    { $setOnInsert: { role: invite.role } },
    { upsert: true }
  );
  invite.acceptedAt = new Date();
  await invite.save();

  const workspace = await WorkspaceModel.findById(invite.workspaceId);
  res.json({ workspace: workspace ? { slug: workspace.slug, name: workspace.name } : null });
};
