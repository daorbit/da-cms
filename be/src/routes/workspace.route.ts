import { Router } from 'express';
import {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  getSettings,
  updateSettings,
} from '../controllers/workspace.controller.js';
import { getPublicPageBySlug, listPublicPages } from '../controllers/page.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireApiAuth } from '../middleware/require-api-auth.js';
import { requireWorkspaceRole } from '../middleware/require-workspace-member.js';
import { pageRoutes } from './page.route.js';
import { dashboardRoutes } from './dashboard.route.js';
import { memberRoutes } from './member.route.js';

export const workspaceRoutes = Router();

// Public, no auth — the content API an external site calls to render a page it
// owns here. Declared before any auth so it stays open.
/* The two halves of a content site: `pagebyslug` is the index a listing page
   renders, `page-details/:slug` is the one post behind a dynamic route. */
workspaceRoutes.get('/:workspaceId/pagebyslug', asyncHandler(listPublicPages));
workspaceRoutes.get('/:workspaceId/page-details/:slug', asyncHandler(getPublicPageBySlug));

/* Everything scoped to a workspace authenticates the same way, whether the
   caller is the editor in a browser or a script: `requireApiAuth` takes the
   session cookie or the same token as an Authorization: Bearer header, then
   checks the caller's membership of this workspace. */
workspaceRoutes.get('/:workspaceId', requireApiAuth, asyncHandler(getWorkspace));
workspaceRoutes.patch(
  '/:workspaceId',
  requireApiAuth,
  requireWorkspaceRole('owner', 'admin'),
  asyncHandler(updateWorkspace)
);

workspaceRoutes.get('/:workspaceId/settings', requireApiAuth, asyncHandler(getSettings));
workspaceRoutes.patch(
  '/:workspaceId/settings',
  requireApiAuth,
  requireWorkspaceRole('owner', 'admin'),
  asyncHandler(updateSettings)
);

workspaceRoutes.use('/:workspaceId/pages', requireApiAuth, pageRoutes);
workspaceRoutes.use('/:workspaceId/dashboard', requireApiAuth, dashboardRoutes);
workspaceRoutes.use('/:workspaceId/members', requireApiAuth, memberRoutes);

/* Not workspace-scoped, so there is no `:workspaceId` to check a membership
   against — these are gated on the session alone. */
workspaceRoutes.post('/', requireAuth, asyncHandler(createWorkspace));
workspaceRoutes.get('/', requireAuth, asyncHandler(listWorkspaces));
