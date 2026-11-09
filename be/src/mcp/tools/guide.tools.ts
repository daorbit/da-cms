import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BLOG_WORKFLOW } from '../instructions.js';
import { BLOG_BRIEF } from '../writing-guide.js';

export function registerGuideTools(server: McpServer) {
  server.registerTool(
    'get_writing_guide',
    {
      title: 'Get the writing guide',
      description:
        'The editorial standard every da-cms post must meet: length, structure, SEO, sourcing, voice and the exact HTML the editor accepts. Call this before writing or rewriting any post or page.',
      annotations: { readOnlyHint: true },
    },
    () => ({ content: [{ type: 'text', text: `${BLOG_WORKFLOW}\n\n${BLOG_BRIEF}` }] })
  );
}
