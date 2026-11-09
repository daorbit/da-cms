import { Router } from 'express';
import { handleMcp, mcpMethodNotAllowed } from '../controllers/mcp.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireMcpAuth } from '../middleware/require-mcp-auth.js';

export const mcpRoutes = Router();

mcpRoutes.post('/', requireMcpAuth, asyncHandler(handleMcp));
mcpRoutes.all('/', mcpMethodNotAllowed);
