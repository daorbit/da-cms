import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { verifyToken } from '../lib/jwt.js';
import type { ApiError } from '../types/index.js';
import type { WorkspaceRole } from '../models/membership.model.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      /** Set by `requireWorkspaceMember` for `/:workspaceId/*` routes. */
      workspaceRole?: WorkspaceRole;
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.cookies?.[env.cookieName];
  if (!token) {
    const body: ApiError = { error: 'unauthorized', message: 'Not signed in' };
    res.status(401).json(body);
    return;
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    const body: ApiError = { error: 'unauthorized', message: 'Invalid or expired session' };
    res.status(401).json(body);
  }
};
