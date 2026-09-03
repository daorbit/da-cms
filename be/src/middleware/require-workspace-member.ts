import type { RequestHandler } from 'express';
import { MembershipModel } from '../models/membership.model.js';
import type { WorkspaceRole } from '../models/membership.model.js';
import type { ApiError } from '../types/index.js';

/**
 * Runs after `requireAuth`. Confirms the signed-in user belongs to the
 * `:workspaceId` in the URL before any workspace-scoped route touches it —
 * a workspace id is not a secret, so without this anyone signed in could
 * read or write another workspace's data by guessing its id.
 *
 * Stashes the caller's role on `req.workspaceRole` so `requireWorkspaceRole`
 * can gate individual routes without a second query.
 */
export const requireWorkspaceMember: RequestHandler = async (req, res, next) => {
  const { workspaceId } = req.params;
  const membership = await MembershipModel.findOne({
    userId: req.userId,
    workspaceId,
    status: 'active',
  });

  if (!membership) {
    const body: ApiError = { error: 'forbidden', message: 'Not a member of this workspace' };
    res.status(403).json(body);
    return;
  }

  req.workspaceRole = membership.role as WorkspaceRole;
  next();
};

/**
 * Gate a route to a set of roles. Must be mounted after `requireWorkspaceMember`
 * so `req.workspaceRole` is populated.
 */
export function requireWorkspaceRole(...allowed: WorkspaceRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.workspaceRole || !allowed.includes(req.workspaceRole)) {
      const body: ApiError = {
        error: 'forbidden',
        message: 'You do not have permission to do this',
      };
      res.status(403).json(body);
      return;
    }
    next();
  };
}
