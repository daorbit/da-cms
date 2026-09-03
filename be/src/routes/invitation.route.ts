import { Router } from 'express';
import {
  previewInvitation,
  acceptInvitation,
  declineInvitation,
} from '../controllers/member.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/require-auth.js';

export const invitationRoutes = Router();

// Public: lets the accept page show workspace + role before sign-in.
invitationRoutes.get('/:token', asyncHandler(previewInvitation));

invitationRoutes.post('/:token/accept', requireAuth, asyncHandler(acceptInvitation));
invitationRoutes.delete('/:token/decline', requireAuth, asyncHandler(declineInvitation));
