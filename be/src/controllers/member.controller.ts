import type { RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { MembershipModel } from '../models/membership.model.js';
import { InviteModel } from '../models/invite.model.js';
import { UserModel } from '../models/user.model.js';
import { WorkspaceModel } from '../models/workspace.model.js';
import { mailConfigured, sendInviteEmail } from '../lib/mailer.js';
import { env } from '../config/env.js';
import type { ApiError } from '../types/index.js';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Roles an invite or a role change may target — never 'owner'. */
const assignableRole = z.enum(['admin', 'editor']);

function badRequest(res: Parameters<RequestHandler>[1], message: string, code = 'invalid_input') {
  const body: ApiError = { error: code, message };
  res.status(code === 'invalid_input' ? 400 : 409).json(body);
}

interface MemberUser {
  _id: unknown;
  name?: string;
  email?: string;
}

function toMember(m: { _id: unknown; role: string; userId: MemberUser; createdAt?: Date }) {
  return {
    id: String(m._id),
    role: m.role,
    joinedAt: m.createdAt ?? null,
    user: {
      id: String(m.userId._id),
      name: m.userId.name ?? null,
      email: m.userId.email ?? null,
    },
  };
}

function toInvite(i: {
  _id: unknown;
  email: string;
  role: string;
  expiresAt: Date;
  createdAt?: Date;
}) {
  return {
    id: String(i._id),
    email: i.email,
    role: i.role,
    expiresAt: i.expiresAt,
    invitedAt: i.createdAt ?? null,
    expired: i.expiresAt.getTime() < Date.now(),
  };
}

/** GET /workspaces/:workspaceId/members — members plus pending invites. */
export const listMembers: RequestHandler = async (req, res) => {
  const { workspaceId } = req.params;

  const [members, invites] = await Promise.all([
    MembershipModel.find({ workspaceId })
      .populate<{ userId: MemberUser }>('userId', 'name email')
      .sort({ createdAt: 1 }),
    InviteModel.find({ workspaceId, acceptedAt: null }).sort({ createdAt: -1 }),
  ]);

  res.json({
    members: members
      // A membership whose user was deleted has nothing to show.
      .filter((m) => m.userId)
      .map((m) => toMember(m as unknown as Parameters<typeof toMember>[0])),
    invites: invites.map((i) => toInvite(i)),
  });
};

const inviteSchema = z.object({
  email: z.string().email(),
  role: assignableRole.default('editor'),
});

/** POST /workspaces/:workspaceId/members/invites */
export const createInvite: RequestHandler = async (req, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    badRequest(res, parsed.error.issues[0].message);
    return;
  }

  const { workspaceId } = req.params;
  const email = parsed.data.email.toLowerCase();

  // Already a member? Nothing to invite.
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    const already = await MembershipModel.exists({ workspaceId, userId: existingUser._id });
    if (already) {
      badRequest(res, 'That person is already a member', 'already_member');
      return;
    }
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  // Re-inviting the same address refreshes the token and expiry rather than
  // erroring on the unique index.
  const invite = await InviteModel.findOneAndUpdate(
    { workspaceId, email },
    { role: parsed.data.role, token, invitedBy: req.userId, expiresAt, acceptedAt: null },
    { new: true, upsert: true }
  );

  const [workspace, inviter] = await Promise.all([
    WorkspaceModel.findById(workspaceId),
    UserModel.findById(req.userId),
  ]);

  const acceptUrl = `${env.appUrl}/invite/${token}`;
  if (mailConfigured() && workspace) {
    sendInviteEmail(
      { email, name: email },
      {
        workspaceName: workspace.name,
        inviterName: inviter?.name ?? 'A teammate',
        role: parsed.data.role,
        acceptUrl,
      }
    ).catch((err) => console.error('invite email failed', err));
  }

  // acceptUrl is returned so the client can show a copyable link even when mail
  // is not configured (local dev).
  res.status(201).json({ invite: toInvite(invite), acceptUrl });
};

/** POST /workspaces/:workspaceId/members/invites/:inviteId/resend */
export const resendInvite: RequestHandler = async (req, res) => {
  const { workspaceId, inviteId } = req.params;
  const invite = await InviteModel.findOne({ _id: inviteId, workspaceId, acceptedAt: null });
  if (!invite) {
    const body: ApiError = { error: 'not_found', message: 'Invite not found' };
    res.status(404).json(body);
    return;
  }

  invite.token = randomBytes(24).toString('hex');
  invite.expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await invite.save();

  const [workspace, inviter] = await Promise.all([
    WorkspaceModel.findById(workspaceId),
    UserModel.findById(req.userId),
  ]);
  const acceptUrl = `${env.appUrl}/invite/${invite.token}`;
  if (mailConfigured() && workspace) {
    sendInviteEmail(
      { email: invite.email, name: invite.email },
      {
        workspaceName: workspace.name,
        inviterName: inviter?.name ?? 'A teammate',
        role: invite.role,
        acceptUrl,
      }
    ).catch((err) => console.error('invite email failed', err));
  }

  res.json({ invite: toInvite(invite), acceptUrl });
};

/** DELETE /workspaces/:workspaceId/members/invites/:inviteId */
export const revokeInvite: RequestHandler = async (req, res) => {
  const { workspaceId, inviteId } = req.params;
  const result = await InviteModel.findOneAndDelete({ _id: inviteId, workspaceId, acceptedAt: null });
  if (!result) {
    const body: ApiError = { error: 'not_found', message: 'Invite not found' };
    res.status(404).json(body);
    return;
  }
  res.status(204).end();
};

const roleChangeSchema = z.object({ role: assignableRole });

/** PATCH /workspaces/:workspaceId/members/:membershipId */
export const updateMemberRole: RequestHandler = async (req, res) => {
  const parsed = roleChangeSchema.safeParse(req.body);
  if (!parsed.success) {
    badRequest(res, parsed.error.issues[0].message);
    return;
  }

  const { workspaceId, membershipId } = req.params;
  const membership = await MembershipModel.findOne({ _id: membershipId, workspaceId });
  if (!membership) {
    const body: ApiError = { error: 'not_found', message: 'Member not found' };
    res.status(404).json(body);
    return;
  }
  if (membership.role === 'owner') {
    badRequest(res, "The owner's role cannot be changed", 'forbidden');
    return;
  }

  membership.role = parsed.data.role;
  await membership.save();

  await membership.populate<{ userId: MemberUser }>('userId', 'name email');
  res.json({ member: toMember(membership as unknown as Parameters<typeof toMember>[0]) });
};

/** DELETE /workspaces/:workspaceId/members/:membershipId */
export const removeMember: RequestHandler = async (req, res) => {
  const { workspaceId, membershipId } = req.params;
  const membership = await MembershipModel.findOne({ _id: membershipId, workspaceId });
  if (!membership) {
    const body: ApiError = { error: 'not_found', message: 'Member not found' };
    res.status(404).json(body);
    return;
  }
  if (membership.role === 'owner') {
    badRequest(res, 'The workspace owner cannot be removed', 'forbidden');
    return;
  }
  // An admin can leave via this route, but cannot remove another admin — only
  // the owner can.
  if (membership.role === 'admin' && req.workspaceRole !== 'owner' && String(membership.userId) !== req.userId) {
    badRequest(res, 'Only the owner can remove an admin', 'forbidden');
    return;
  }

  await membership.deleteOne();
  res.status(204).end();
};
