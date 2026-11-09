import type { RequestHandler } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { issuerUrl } from '../lib/oauth.js';
import { createMcpServer } from '../mcp/server.js';

/** Stateless Streamable HTTP: each POST carries a whole exchange, answered as JSON. */
export const handleMcp: RequestHandler = async (req, res) => {
  const server = createMcpServer({ userId: String(req.userId), apiUrl: `${issuerUrl(req)}/api` });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on('close', () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
};

/** No sessions means no SSE stream to open and nothing to delete. */
export const mcpMethodNotAllowed: RequestHandler = (_req, res) => {
  res
    .status(405)
    .set('Allow', 'POST')
    .json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null });
};
