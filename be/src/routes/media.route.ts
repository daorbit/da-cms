import { Router } from 'express';
import {
  listMedia,
  uploadMedia,
  updateMedia,
  deleteMedia,
} from '../controllers/media.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';

// `mergeParams` so `:workspaceId` from the parent mount is visible here.
export const mediaRoutes = Router({ mergeParams: true });

/* Mounted behind `requireApiAuth`, which has already established that the
   caller is a member of this workspace. */

mediaRoutes.get('/', asyncHandler(listMedia));
mediaRoutes.post('/', asyncHandler(uploadMedia));
mediaRoutes.patch('/:id', asyncHandler(updateMedia));
mediaRoutes.delete('/:id', asyncHandler(deleteMedia));
