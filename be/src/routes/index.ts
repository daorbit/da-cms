import { Router } from 'express';
import { healthRoutes } from './health.route.js';
import { authRoutes } from './auth.route.js';
import { workspaceRoutes } from './workspace.route.js';
import { invitationRoutes } from './invitation.route.js';
import { aiRoutes } from './ai.route.js';

export const routes = Router();

routes.use(healthRoutes);
routes.use('/auth', authRoutes);
routes.use('/workspaces', workspaceRoutes);
routes.use('/invitation', invitationRoutes);
routes.use('/ai', aiRoutes);
