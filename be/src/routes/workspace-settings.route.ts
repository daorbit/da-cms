import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/workspace-settings.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import {
  requireWorkspaceMember,
  requireWorkspaceRole,
} from '../middleware/require-workspace-member.js';

export const workspaceSettingsRoutes = Router({ mergeParams: true });

workspaceSettingsRoutes.use(requireWorkspaceMember);

// Any member can read settings (the page editor needs the group/tag lists).
workspaceSettingsRoutes.get('/', asyncHandler(getSettings));

// Only owner/admin can change the taxonomy or site links.
workspaceSettingsRoutes.patch('/', requireWorkspaceRole('owner', 'admin'), asyncHandler(updateSettings));
