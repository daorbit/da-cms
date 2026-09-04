import { Router } from 'express';
import {
  createPage,
  listPages,
  getPage,
  getPagePreview,
  updatePage,
  deletePage,
} from '../controllers/page.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireWorkspaceMember } from '../middleware/require-workspace-member.js';

export const pageRoutes = Router({ mergeParams: true });

pageRoutes.use(requireWorkspaceMember);

pageRoutes.post('/', asyncHandler(createPage));
pageRoutes.get('/', asyncHandler(listPages));
pageRoutes.get('/:id', asyncHandler(getPage));
pageRoutes.get('/:id/preview', asyncHandler(getPagePreview));
pageRoutes.patch('/:id', asyncHandler(updatePage));
pageRoutes.delete('/:id', asyncHandler(deletePage));
