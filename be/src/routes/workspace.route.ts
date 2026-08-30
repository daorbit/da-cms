import { Router } from 'express';
import { createWorkspace, listWorkspaces } from '../controllers/workspace.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/require-auth.js';
import { collectionRoutes } from './collection.route.js';

export const workspaceRoutes = Router();

workspaceRoutes.use(requireAuth);

workspaceRoutes.post('/', asyncHandler(createWorkspace));
workspaceRoutes.get('/', asyncHandler(listWorkspaces));

workspaceRoutes.use('/:workspaceId/collections', collectionRoutes);
