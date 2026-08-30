import { Router } from 'express';
import {
  createContent,
  listContent,
  getContent,
  updateContent,
  deleteContent,
} from '../controllers/content.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';

export const contentRoutes = Router({ mergeParams: true });

contentRoutes.post('/', asyncHandler(createContent));
contentRoutes.get('/', asyncHandler(listContent));
contentRoutes.get('/:id', asyncHandler(getContent));
contentRoutes.patch('/:id', asyncHandler(updateContent));
contentRoutes.delete('/:id', asyncHandler(deleteContent));
