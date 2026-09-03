import type { RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { MembershipModel } from '../models/membership.model.js';
import { UserModel } from '../models/user.model.js';
import { WorkspaceModel } from '../models/workspace.model.js';
import { mailConfigured, sendInviteEmail } from '../lib/mailer.js';
import { env } from '../config/env.js';
import type { ApiError } from '../types/index.js';

/** Roles an invite or a role change may target — never 'owner'. */
const assignableRole = z.enum(['admin', 'editor']);

function fail(res: Parameters<RequestHandler>[1], status: number, error: string, message: string) {
  const body: ApiError = { error, message };
  res.status(status).json(body);
}

interface MemberUser {
  _id: unknown;
  name?: string;
  email?: string;
}
interface MembershipDoc {
  _id: unknown;
  role: string;
  status: string;
  invitedEmail?: string;
  invitedName?: string;
  invitedAt?: Date | null;
  createdAt?: Date;
  userId?: MemberUser | null;
}

function toRow(m: MembershipDoc) {
  const active = m.status === 'active' && m.userId;
  return {
    id: String(m._id),
    role: m.role,
    status: m.status,
    joinedAt: m.createdAt ?? null,
    invitedAt: m.invitedAt ?? null,
    user: active
      ? {
          id: String(m.userId!._id),
          name: m.userId!.name ?? null,
          email: m.userId!.email ?? null,
        }
      : { id: null, name: m.invitedName || null, email: m.invitedEmail || null },
  };
}

/** GET /workspaces/:workspaceId/members — active members and pending invites. */
export const listMembers: RequestHandler = async (req, res) => {
  const rows = await MembershipModel.find({ workspaceId: req.params.workspaceId })
    .populate<{ userId: MemberUser }>('userId', 'name email')
    .sort({ status: 1, createdAt: 1 });

  const all = rows.map((r) => toRow(r as unknown as MembershipDoc));
  res.json({
    members: all.filter((r) => r.status === 'active'),
    invites: all.filter((r) => r.status === 'pending'),
  });
};

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  role: assignableRole.default('editor'),
});

async function emailInvite(workspaceId: string, inviterId: string | undefined, row: MembershipDoc & { inviteToken?: string | null }) {
  const [workspace, inviter] = await Promise.all([
    WorkspaceModel.findById(workspaceId),
    inviterId ? UserModel.findById(inviterId) : null,
  ]);
  const acceptUrl = `${env.appUrl}/invite/${row.inviteToken}`;
  if (mailConfigured() && workspace && row.invitedEmail) {
    sendInviteEmail(
      { email: row.invitedEmail, name: row.invitedName || row.invitedEmail },
      {
        workspaceName: workspace.name,
        inviterName: inviter?.name ?? 'A teammate',
        role: row.role,
        acceptUrl,
      }
    ).catch((err) => console.error('invite email failed', err));
  }
  return acceptUrl;
}

/** POST /workspaces/:workspaceId/members/invites */
export const createInvite: RequestHandler = async (req, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    fail(res, 400, 'invalid_input', parsed.error.issues[0].message);
    return;
  }

  const { workspaceId } = req.params;
  const email = parsed.data.email.toLowerCase();

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    const active = await MembershipModel.exists({
      workspaceId,
      userId: existingUser._id,
      status: 'active',
    });
    if (active) {
      fail(res, 409, 'already_member', 'That person is already a member');
      return;
    }
  }

  const inviteToken = randomBytes(24).toString('hex');
  // Re-inviting the same address refreshes the token rather than colliding.
  const row = await MembershipModel.findOneAndUpdate(
    { workspaceId, invitedEmail: email, status: 'pending' },
    {
      workspaceId,
      invitedEmail: email,
      invitedName: parsed.data.name ?? '',
      role: parsed.data.role,
      status: 'pending',
      userId: existingUser?._id ?? null,
      inviteToken,
      invitedBy: req.userId,
      invitedAt: new Date(),
    },
    { new: true, upsert: true }
  );

  const acceptUrl = await emailInvite(workspaceId, req.userId, row as unknown as MembershipDoc & { inviteToken: string });
  res.status(201).json({ invite: toRow(row as unknown as MembershipDoc), acceptUrl });
};

/** POST /workspaces/:workspaceId/members/invites/:inviteId/resend */
export const resendInvite: RequestHandler = async (req, res) => {
  const { workspaceId, inviteId } = req.params;
  const row = await MembershipModel.findOne({ _id: inviteId, workspaceId, status: 'pending' });
  if (!row) {
    fail(res, 404, 'not_found', 'Invite not found');
    return;
  }
  row.inviteToken = randomBytes(24).toString('hex');
  row.invitedAt = new Date();
  await row.save();
  const acceptUrl = await emailInvite(workspaceId, req.userId, row as unknown as MembershipDoc & { inviteToken: string });
  res.json({ invite: toRow(row as unknown as MembershipDoc), acceptUrl });
};

/** DELETE /workspaces/:workspaceId/members/invites/:inviteId */
export const revokeInvite: RequestHandler = async (req, res) => {
  const { workspaceId, inviteId } = req.params;
  const result = await MembershipModel.findOneAndDelete({
    _id: inviteId,
    workspaceId,
    status: 'pending',
  });
  if (!result) {
    fail(res, 404, 'not_found', 'Invite not found');
    return;
  }
  res.status(204).end();
};

const roleChangeSchema = z.object({ role: assignableRole });

/** PATCH /workspaces/:workspaceId/members/:membershipId */
export const updateMemberRole: RequestHandler = async (req, res) => {
  const parsed = roleChangeSchema.safeParse(req.body);
  if (!parsed.success) {
    fail(res, 400, 'invalid_input', parsed.error.issues[0].message);
    return;
  }

  const { workspaceId, membershipId } = req.params;
  const membership = await MembershipModel.findOne({ _id: membershipId, workspaceId });
  if (!membership) {
    fail(res, 404, 'not_found', 'Member not found');
    return;
  }
  if (membership.role === 'owner') {
    fail(res, 403, 'forbidden', "The owner's role cannot be changed");
    return;
  }

  membership.role = parsed.data.role;
  await membership.save();
  await membership.populate<{ userId: MemberUser }>('userId', 'name email');
  res.json({ member: toRow(membership as unknown as MembershipDoc) });
};

/** DELETE /workspaces/:workspaceId/members/:membershipId */
export const removeMember: RequestHandler = async (req, res) => {
  const { workspaceId, membershipId } = req.params;
  const membership = await MembershipModel.findOne({ _id: membershipId, workspaceId });
  if (!membership) {
    fail(res, 404, 'not_found', 'Member not found');
    return;
  }
  if (membership.role === 'owner') {
    fail(res, 403, 'forbidden', 'The workspace owner cannot be removed');
    return;
  }
  if (
    membership.role === 'admin' &&
    req.workspaceRole !== 'owner' &&
    String(membership.userId) !== req.userId
  ) {
    fail(res, 403, 'forbidden', 'Only the owner can remove an admin');
    return;
  }

  await membership.deleteOne();
  res.status(204).end();
};

/* ------------------------------------------------- invitation accept/decline */

/** GET /invitation/:token — public preview shown before sign-in. */
export const previewInvitation: RequestHandler = async (req, res) => {
  const row = await MembershipModel.findOne({ inviteToken: req.params.token, status: 'pending' });
  if (!row) {
    fail(res, 404, 'not_found', 'This invite is no longer valid');
    return;
  }
  const workspace = await WorkspaceModel.findById(row.workspaceId);
  res.json({
    email: row.invitedEmail,
    role: row.role,
    workspace: workspace ? { name: workspace.name, slug: workspace.slug } : null,
  });
};

const acceptSchema = z.object({ forceAcceptOtherEmail: z.boolean().default(false) });

/** POST /invitation/:token/accept — requires an authenticated session. */
export const acceptInvitation: RequestHandler = async (req, res) => {
  const parsed = acceptSchema.safeParse(req.body ?? {});
  const forceOther = parsed.success ? parsed.data.forceAcceptOtherEmail : false;

  const row = await MembershipModel.findOne({ inviteToken: req.params.token, status: 'pending' });
  if (!row) {
    fail(res, 404, 'not_found', 'This invite is no longer valid');
    return;
  }

  const user = await UserModel.findById(req.userId);
  if (!user) {
    fail(res, 401, 'unauthorized', 'Not signed in');
    return;
  }
  if (user.email.toLowerCase() !== (row.invitedEmail ?? '').toLowerCase() && !forceOther) {
    fail(
      res,
      400,
      'email_mismatch',
      `This invite is for ${row.invitedEmail}. Accept anyway with your account?`
    );
    return;
  }

  // If the user already has an active membership (e.g. re-invited), just consume
  // the pending row.
  const alreadyActive = await MembershipModel.findOne({
    workspaceId: row.workspaceId,
    userId: user._id,
    status: 'active',
  });
  if (alreadyActive) {
    await row.deleteOne();
  } else {
    row.userId = user._id;
    row.status = 'active';
    row.inviteToken = null;
    await row.save();
  }

  const workspace = await WorkspaceModel.findById(row.workspaceId);
  res.json({ workspace: workspace ? { slug: workspace.slug, name: workspace.name } : null });
};

/** DELETE /invitation/:token/decline — requires auth. */
export const declineInvitation: RequestHandler = async (req, res) => {
  const row = await MembershipModel.findOne({ inviteToken: req.params.token, status: 'pending' });
  if (!row) {
    res.status(204).end();
    return;
  }
  await row.deleteOne();
  res.status(204).end();
};
