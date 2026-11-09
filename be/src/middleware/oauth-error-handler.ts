import type { ErrorRequestHandler } from 'express';
import { OAuthError } from '../lib/oauth.js';

/**
 * OAuth clients expect `{ error, error_description }`, not the API's own error
 * shape. A browser-facing GET (the authorize step) gets the message as text,
 * since there is no client page to render it. Anything else falls through to
 * the app's error handler.
 */
export const oauthErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (!(err instanceof OAuthError)) {
    next(err);
    return;
  }

  if (req.method === 'GET') {
    res.status(err.status).type('text').send(`${err.error}: ${err.message}`);
    return;
  }

  res.status(err.status).json({ error: err.error, error_description: err.message });
};
