import { Router } from 'express';
import { getInvite, acceptInvite } from '../controllers/invite.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/require-auth.js';

export const inviteRoutes = Router();

// Public: lets the accept page show workspace + role before the user signs in.
inviteRoutes.get('/:token', asyncHandler(getInvite));

// Accepting binds the invite to the signed-in account.
inviteRoutes.post('/:token/accept', requireAuth, asyncHandler(acceptInvite));
