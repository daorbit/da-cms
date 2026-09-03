import { Router } from 'express';
import {
  listMembers,
  createInvite,
  resendInvite,
  revokeInvite,
  updateMemberRole,
  removeMember,
} from '../controllers/member.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import {
  requireWorkspaceMember,
  requireWorkspaceRole,
} from '../middleware/require-workspace-member.js';

export const memberRoutes = Router({ mergeParams: true });

memberRoutes.use(requireWorkspaceMember);

// Any member can see who else is in the workspace.
memberRoutes.get('/', asyncHandler(listMembers));

// Everything that changes membership is owner/admin only.
memberRoutes.use(requireWorkspaceRole('owner', 'admin'));

memberRoutes.post('/invites', asyncHandler(createInvite));
memberRoutes.post('/invites/:inviteId/resend', asyncHandler(resendInvite));
memberRoutes.delete('/invites/:inviteId', asyncHandler(revokeInvite));

memberRoutes.patch('/:membershipId', asyncHandler(updateMemberRole));
memberRoutes.delete('/:membershipId', asyncHandler(removeMember));
