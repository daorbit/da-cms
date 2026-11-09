import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { WorkspaceModel } from '../models/workspace.model.js';
import { findActiveMembership } from '../services/workspace.service.js';
import { invalidInput, notFound, ServiceError } from '../lib/service-error.js';

/** Who the MCP request is acting for, and where its links should point. */
export interface McpContext {
  userId: string;
  /** The public API base, e.g. https://cms.example.com/api. */
  apiUrl: string;
}

/**
 * Every workspace-scoped tool starts here: the access token proves who the
 * user is, and this proves they may touch the workspace they named.
 */
export async function requireWorkspace(ctx: McpContext, workspaceId: string) {
  if (!Types.ObjectId.isValid(workspaceId)) {
    throw invalidInput('workspaceId is not valid. Call list_workspaces to find it.');
  }

  const membership = await findActiveMembership(ctx.userId, workspaceId);
  if (!membership) throw new ServiceError(403, 'forbidden', 'You are not a member of this workspace');

  const workspace = await WorkspaceModel.findById(workspaceId).select('slug');
  if (!workspace) throw notFound('Workspace not found');

  return { slug: workspace.slug, role: membership.role };
}

export function editorUrl(workspaceSlug: string, pageId: string) {
  return `${env.appUrl}/${workspaceSlug}/content/pages/${pageId}/edit`;
}

export function contentApiUrl(ctx: McpContext, workspaceId: string, slug: string) {
  return `${ctx.apiUrl}/workspaces/${workspaceId}/page-details/${slug}`;
}
