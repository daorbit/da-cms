import express, { Router } from 'express';
import {
  authorize,
  getConsent,
  postConsent,
  register,
  revoke,
  token,
} from '../controllers/oauth.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/require-auth.js';
import { oauthErrorHandler } from '../middleware/oauth-error-handler.js';

export const oauthRoutes = Router();

// The token and revocation endpoints take form-encoded bodies, per the spec.
oauthRoutes.use(express.urlencoded({ extended: false }));

oauthRoutes.post('/register', asyncHandler(register));
oauthRoutes.get('/authorize', asyncHandler(authorize));
oauthRoutes.post('/token', asyncHandler(token));
oauthRoutes.post('/revoke', asyncHandler(revoke));

/* The consent screen runs in the app as the signed-in user. The session
   cookie is SameSite=lax, so another site cannot post a decision for them. */
oauthRoutes.get('/consent', requireAuth, asyncHandler(getConsent));
oauthRoutes.post('/consent', requireAuth, asyncHandler(postConsent));

oauthRoutes.use(oauthErrorHandler);
