import { Router } from 'express';
import {
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
} from '../controllers/collection.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireWorkspaceMember } from '../middleware/require-workspace-member.js';
import { contentRoutes } from './content.route.js';

export const collectionRoutes = Router({ mergeParams: true });

collectionRoutes.use(requireWorkspaceMember);

collectionRoutes.post('/', asyncHandler(createCollection));
collectionRoutes.get('/', asyncHandler(listCollections));
collectionRoutes.get('/:id', asyncHandler(getCollection));
collectionRoutes.patch('/:id', asyncHandler(updateCollection));
collectionRoutes.delete('/:id', asyncHandler(deleteCollection));

collectionRoutes.use('/:collectionId/content', contentRoutes);
