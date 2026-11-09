import type { RequestHandler } from 'express';
import { bearerToken } from '../lib/bearer.js';
import { mcpResourceUrl, protectedResourceMetadataUrl } from '../lib/oauth.js';
import { verifyAccessToken } from '../services/oauth.service.js';
import type { ApiError } from '../types/index.js';

/**
 * Accepts only OAuth access tokens issued for this MCP endpoint. A missing or
 * bad token gets a 401 whose WWW-Authenticate header points the client at the
 * metadata it needs to start the OAuth flow.
 */
export const requireMcpAuth: RequestHandler = (req, res, next) => {
  const token = bearerToken(req.get('authorization'));

  if (token) {
    try {
      req.userId = verifyAccessToken(token, mcpResourceUrl(req)).userId;
      next();
      return;
    } catch {
      /* falls through to the challenge */
    }
  }

  const body: ApiError = { error: 'unauthorized', message: 'A valid access token is required' };
  res
    .status(401)
    .set('WWW-Authenticate', `Bearer resource_metadata="${protectedResourceMetadataUrl(req)}"`)
    .json(body);
};
