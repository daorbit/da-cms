import { Router } from 'express';
import {
  createPage,
  listPages,
  getPage,
  updatePage,
  deletePage,
  bulkPages,
} from '../controllers/page.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireWorkspaceMember } from '../middleware/require-workspace-member.js';

export const pageRoutes = Router({ mergeParams: true });

pageRoutes.use(requireWorkspaceMember);

pageRoutes.post('/', asyncHandler(createPage));
pageRoutes.get('/', asyncHandler(listPages));
// Before '/:id' so "bulk" is not parsed as a page id.
pageRoutes.post('/bulk', asyncHandler(bulkPages));
pageRoutes.get('/:id', asyncHandler(getPage));
pageRoutes.patch('/:id', asyncHandler(updatePage));
pageRoutes.delete('/:id', asyncHandler(deletePage));
