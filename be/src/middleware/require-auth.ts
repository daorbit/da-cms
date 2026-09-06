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
  // The browser sends the session in an httpOnly cookie; a script or another
  // server sends the same token as a bearer header. One credential, two
  // transports — so API callers get exactly the access the user has.
  const header = req.get('authorization');
  const bearer = header ? /^Bearer\s+(\S+)$/i.exec(header.trim())?.[1] : null;
  const token = bearer ?? req.cookies?.[env.cookieName];

  if (!token) {
    const body: ApiError = {
      error: 'unauthorized',
      message: 'Sign in, or send your token as an Authorization: Bearer header',
    };
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
