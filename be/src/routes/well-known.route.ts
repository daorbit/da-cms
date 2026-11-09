import { Router } from 'express';
import {
  authorizationServerMetadata,
  protectedResourceMetadata,
} from '../controllers/oauth.controller.js';

export const wellKnownRoutes = Router();

/* MCP clients probe both the bare and the path-suffixed forms, so both answer. */
wellKnownRoutes.get(
  ['/oauth-protected-resource', '/oauth-protected-resource/api/mcp'],
  protectedResourceMetadata
);
wellKnownRoutes.get(
  ['/oauth-authorization-server', '/oauth-authorization-server/api/mcp'],
  authorizationServerMetadata
);
