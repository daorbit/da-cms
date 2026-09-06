import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { verifyToken } from '../lib/jwt.js';
import { MembershipModel } from '../models/membership.model.js';
import type { WorkspaceRole } from '../models/membership.model.js';
import type { ApiError } from '../types/index.js';

/** A bearer token from the Authorization header, if one is present. */
function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

 
export const requireApiAuth: RequestHandler = async (req, res, next) => {
  const token = bearerToken(req.get('authorization')) ?? req.cookies?.[env.cookieName];

  if (!token) {
    const body: ApiError = {
      error: 'unauthorized',
      message: 'Sign in, or send your token as an Authorization: Bearer header',
    };
    res.status(401).json(body);
    return;
  }

  let userId: string;
  try {
    userId = verifyToken(token).userId;
  } catch {
    const body: ApiError = { error: 'unauthorized', message: 'Invalid or expired token' };
    res.status(401).json(body);
    return;
  }

  const { workspaceId } = req.params;
  const membership = await MembershipModel.findOne({ userId, workspaceId, status: 'active' });

  if (!membership) {
    const body: ApiError = { error: 'forbidden', message: 'Not a member of this workspace' };
    res.status(403).json(body);
    return;
  }

  req.userId = userId;
  req.workspaceRole = membership.role as WorkspaceRole;
  next();
};
