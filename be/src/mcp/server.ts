import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpContext } from './context.js';
import { MCP_INSTRUCTIONS } from './instructions.js';
import { registerWriteBlogPrompt } from './prompts/write-blog.prompt.js';
import { registerGuideTools } from './tools/guide.tools.js';
import { registerMediaTools } from './tools/media.tools.js';
import { registerPageTools } from './tools/page.tools.js';
import { registerWorkspaceTools } from './tools/workspace.tools.js';

/** One server per request: the endpoint is stateless, which serverless needs. */
export function createMcpServer(ctx: McpContext) {
  const server = new McpServer({ name: 'da-cms', version: '1.0.0' }, { instructions: MCP_INSTRUCTIONS });

  registerGuideTools(server);
  registerWorkspaceTools(server, ctx);
  registerPageTools(server, ctx);
  registerMediaTools(server, ctx);
  registerWriteBlogPrompt(server);

  return server;
}
