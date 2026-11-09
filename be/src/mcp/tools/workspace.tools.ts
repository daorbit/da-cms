import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { workspaceWithSettings, workspacesForUser } from '../../services/workspace.service.js';
import { requireWorkspace, type McpContext } from '../context.js';
import { workspaceIdInput } from '../schemas.js';
import { runTool } from '../tool-result.js';

export function registerWorkspaceTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    'list_workspaces',
    {
      title: 'List workspaces',
      description: 'The da-cms workspaces you belong to, with your role in each. Start here to get a workspaceId.',
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => workspacesForUser(ctx.userId))
  );

  server.registerTool(
    'get_workspace_context',
    {
      title: 'Get workspace context',
      description:
        'A workspace\'s site URL, its page groups and tags. Call before creating a page: group and tags must use these exact names.',
      inputSchema: { workspaceId: workspaceIdInput },
      annotations: { readOnlyHint: true },
    },
    ({ workspaceId }) =>
      runTool(async () => {
        const { role } = await requireWorkspace(ctx, workspaceId);
        const { settings, ...workspace } = await workspaceWithSettings(workspaceId, role);
        return {
          ...workspace,
          groups: settings.configuration.groups.map((g) => g.name),
          tags: settings.configuration.tags.map((t) => t.name),
          siteLinks: settings.siteLinks,
        };
      })
  );
}
