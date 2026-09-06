import { Router } from 'express';
import {
  createPage,
  listPages,
  getPage,
  updatePage,
  deletePage,
  bulkPages,
  duplicatePage,
  listRevisions,
  getRevision,
  restoreRevision,
} from '../controllers/page.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';

export const pageRoutes = Router({ mergeParams: true });



pageRoutes.post('/', asyncHandler(createPage));
pageRoutes.get('/', asyncHandler(listPages));
// Before '/:id' so "bulk" is not parsed as a page id.
pageRoutes.post('/bulk', asyncHandler(bulkPages));
pageRoutes.get('/:id', asyncHandler(getPage));
pageRoutes.patch('/:id', asyncHandler(updatePage));
pageRoutes.delete('/:id', asyncHandler(deletePage));

/* A page's own history, and copying it as a new draft. */
pageRoutes.post('/:id/duplicate', asyncHandler(duplicatePage));
pageRoutes.get('/:id/revisions', asyncHandler(listRevisions));
pageRoutes.get('/:id/revisions/:revisionId', asyncHandler(getRevision));
pageRoutes.post('/:id/revisions/:revisionId/restore', asyncHandler(restoreRevision));
