import { Router } from 'express';
import { createWorkspace, listWorkspaces } from '../controllers/workspace.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/require-auth.js';
import { pageRoutes } from './page.route.js';
import { dashboardRoutes } from './dashboard.route.js';

export const workspaceRoutes = Router();

workspaceRoutes.use(requireAuth);

workspaceRoutes.post('/', asyncHandler(createWorkspace));
workspaceRoutes.get('/', asyncHandler(listWorkspaces));

workspaceRoutes.use('/:workspaceId/pages', pageRoutes);
workspaceRoutes.use('/:workspaceId/dashboard', dashboardRoutes);
