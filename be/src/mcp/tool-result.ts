import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ServiceError } from '../lib/service-error.js';

/**
 * Runs a tool body and shapes its outcome for the model: data as JSON text, a
 * service failure as an error result it can read and recover from.
 */
export async function runTool(work: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    const data = await work();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  } catch (err) {
    if (!(err instanceof ServiceError)) console.error('[mcp] tool failed:', err);
    const message = err instanceof Error ? err.message : 'Something went wrong';
    return { isError: true, content: [{ type: 'text', text: message }] };
  }
}
