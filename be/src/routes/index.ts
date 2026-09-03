import { Router } from 'express';
import { healthRoutes } from './health.route.js';
import { authRoutes } from './auth.route.js';
import { workspaceRoutes } from './workspace.route.js';
import { inviteRoutes } from './invite.route.js';

export const routes = Router();

routes.use(healthRoutes);
routes.use('/auth', authRoutes);
routes.use('/workspaces', workspaceRoutes);
routes.use('/invites', inviteRoutes);
