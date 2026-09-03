import { Router } from 'express';
import {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
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
import { workspaceSettingsRoutes } from './workspace-settings.route.js';

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

workspaceRoutes.use('/:workspaceId/pages', pageRoutes);
workspaceRoutes.use('/:workspaceId/dashboard', dashboardRoutes);
workspaceRoutes.use('/:workspaceId/members', memberRoutes);
workspaceRoutes.use('/:workspaceId/settings', workspaceSettingsRoutes);
