import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  createPage,
  getPage,
  listPages,
  updatePage,
  type PageResponse,
} from '../../services/page.service.js';
import { contentApiUrl, editorUrl, requireWorkspace, type McpContext } from '../context.js';
import { estimateReadingMinutes, prepareContent } from '../content.js';
import { pageFieldsInput, pageIdInput, pageUpdateInput, workspaceIdInput, type PageFields } from '../schemas.js';
import { runTool } from '../tool-result.js';

type Seo = Record<string, unknown>;

/** SEO to save: the stored values overlaid with the new ones, and the social
 *  image defaulted to the page's own card image. Untouched on an update that
 *  sends no SEO. */
function seoFor(fields: PageFields, existing?: PageResponse): Seo | undefined {
  if (!fields.seo && existing) return undefined;

  const seo: Seo = { ...((existing?.seo as Seo | undefined) ?? {}), ...fields.seo };
  if (!seo.ogImage) {
    const image = fields.thumbnailImage?.url || fields.heroImage?.url;
    if (image) seo.ogImage = image;
  }
  return seo;
}

function toPayload(fields: PageFields, existing?: PageResponse) {
  const payload: Record<string, unknown> = { ...fields };

  if (fields.content !== undefined) {
    const content = prepareContent(fields.content);
    payload.content = content;
    payload.readingMinutes = fields.readingMinutes ?? estimateReadingMinutes(content);
  }

  const seo = seoFor(fields, existing);
  if (seo) payload.seo = seo;
  else delete payload.seo;

  return payload;
}

function withLinks(ctx: McpContext, workspaceId: string, workspaceSlug: string, page: PageResponse) {
  const { content, sections, createdBy, updatedBy, ...summary } = page;
  return {
    ...summary,
    editorUrl: editorUrl(workspaceSlug, page.id),
    ...(page.status === 'published' ? { contentApiUrl: contentApiUrl(ctx, workspaceId, page.slug) } : {}),
  };
}

export function registerPageTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    'list_pages',
    {
      title: 'List pages',
      description:
        'Pages in a workspace, newest edit first, without their body. Search before writing to avoid duplicating a post and to find posts to link to.',
      inputSchema: {
        workspaceId: workspaceIdInput,
        q: z.string().optional().describe('Matches title or slug.'),
        status: z.enum(['draft', 'published', 'archived']).optional(),
        group: z.string().optional(),
        tag: z.string().optional(),
        page: z.number().int().min(1).optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    ({ workspaceId, ...query }) =>
      runTool(async () => {
        const { slug } = await requireWorkspace(ctx, workspaceId);
        const result = await listPages(workspaceId, query);
        return { ...result, items: result.items.map((p) => withLinks(ctx, workspaceId, slug, p)) };
      })
  );

  server.registerTool(
    'get_page',
    {
      title: 'Get page',
      description: 'One page in full, including its HTML content and SEO.',
      inputSchema: { workspaceId: workspaceIdInput, pageId: pageIdInput },
      annotations: { readOnlyHint: true },
    },
    ({ workspaceId, pageId }) =>
      runTool(async () => {
        const { slug } = await requireWorkspace(ctx, workspaceId);
        const page = await getPage(workspaceId, pageId);
        return { ...withLinks(ctx, workspaceId, slug, page), content: page.content };
      })
  );

  server.registerTool(
    'create_page',
    {
      title: 'Create page',
      description:
        'Saves a new page or blog post with its content, images and SEO. Saved as a draft unless status is set. Returns the editor link.',
      inputSchema: { workspaceId: workspaceIdInput, ...pageFieldsInput },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    ({ workspaceId, ...fields }) =>
      runTool(async () => {
        const { slug } = await requireWorkspace(ctx, workspaceId);
        const page = await createPage(workspaceId, ctx.userId, toPayload(fields));
        return withLinks(ctx, workspaceId, slug, page);
      })
  );

  server.registerTool(
    'update_page',
    {
      title: 'Update page',
      description:
        'Changes an existing page. Send only the fields to change; SEO fields are merged into what is stored. Set status to published to publish.',
      inputSchema: { workspaceId: workspaceIdInput, pageId: pageIdInput, ...pageUpdateInput },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    ({ workspaceId, pageId, ...fields }) =>
      runTool(async () => {
        const { slug } = await requireWorkspace(ctx, workspaceId);
        const existing = await getPage(workspaceId, pageId);
        const page = await updatePage(workspaceId, pageId, ctx.userId, toPayload(fields, existing));
        return withLinks(ctx, workspaceId, slug, page);
      })
  );
}
