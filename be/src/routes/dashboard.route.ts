import { Router } from 'express';
import { workspaceStats } from '../controllers/page.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireWorkspaceMember } from '../middleware/require-workspace-member.js';

export const dashboardRoutes = Router({ mergeParams: true });

dashboardRoutes.use(requireWorkspaceMember);

dashboardRoutes.get('/stats', asyncHandler(workspaceStats));
