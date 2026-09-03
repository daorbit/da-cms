import { Router } from 'express';
import {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  getSettings,
  updateSettings,
} from '../controllers/workspace.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/require-auth.js';
import {
  requireWorkspaceMember,
  requireWorkspaceRole,
} from '../middleware/require-workspace-member.js';
import { pageRoutes } from './page.route.js';
import { dashboardRoutes } from './dashboard.route.js';
import { memberRoutes } from './member.route.js';

export const workspaceRoutes = Router();

workspaceRoutes.use(requireAuth);

workspaceRoutes.post('/', asyncHandler(createWorkspace));
workspaceRoutes.get('/', asyncHandler(listWorkspaces));

workspaceRoutes.get(
  '/:workspaceId',
  requireWorkspaceMember,
  asyncHandler(getWorkspace)
);
workspaceRoutes.patch(
  '/:workspaceId',
  requireWorkspaceMember,
  requireWorkspaceRole('owner', 'admin'),
  asyncHandler(updateWorkspace)
);

workspaceRoutes.get(
  '/:workspaceId/settings',
  requireWorkspaceMember,
  asyncHandler(getSettings)
);
workspaceRoutes.patch(
  '/:workspaceId/settings',
  requireWorkspaceMember,
  requireWorkspaceRole('owner', 'admin'),
  asyncHandler(updateSettings)
);

workspaceRoutes.use('/:workspaceId/pages', pageRoutes);
workspaceRoutes.use('/:workspaceId/dashboard', dashboardRoutes);
workspaceRoutes.use('/:workspaceId/members', memberRoutes);
