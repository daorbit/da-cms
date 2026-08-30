import type { RequestHandler } from 'express';
import { MembershipModel } from '../models/membership.model.js';
import type { ApiError } from '../types/index.js';

/**
 * Runs after `requireAuth`. Confirms the signed-in user belongs to the
 * `:workspaceId` in the URL before any collection/content route touches it —
 * a workspace id is not a secret, so without this anyone signed in could
 * read or write another workspace's content by guessing its id.
 */
export const requireWorkspaceMember: RequestHandler = async (req, res, next) => {
  const { workspaceId } = req.params;
  const membership = await MembershipModel.findOne({ userId: req.userId, workspaceId });

  if (!membership) {
    const body: ApiError = { error: 'forbidden', message: 'Not a member of this workspace' };
    res.status(403).json(body);
    return;
  }

  next();
};
