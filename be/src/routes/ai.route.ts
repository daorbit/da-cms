import { Router } from 'express';
import { composeContent } from '../controllers/ai.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/require-auth.js';

export const aiRoutes = Router();

// Authenticated but not workspace-scoped: composing is a writing aid that
// touches no workspace data, and the editor calls it before a page exists.
aiRoutes.post('/compose', requireAuth, asyncHandler(composeContent));
