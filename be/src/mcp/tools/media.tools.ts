import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { cloudflareImage, cloudflareReady } from '../../lib/cloudflare-ai.js';
import { ServiceError } from '../../lib/service-error.js';
import { importRemoteImage, listMedia, uploadFiles } from '../../services/media.service.js';
import { requireWorkspace, type McpContext } from '../context.js';
import { IMAGE_VARIANT_NAMES, imageForPage } from '../images.js';
import { workspaceIdInput } from '../schemas.js';
import { runTool } from '../tool-result.js';

const IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const IMAGE_STEPS = 8;
const IMAGE_TIMEOUT_MS = 60_000;

const imageInput = {
  workspaceId: workspaceIdInput,
  name: z.string().min(1).max(160).describe('File name in the media library, e.g. "remote-work-hero".'),
  alt: z.string().max(300).describe('What the image shows, for screen readers and image search.'),
  variant: z
    .enum(IMAGE_VARIANT_NAMES)
    .default('original')
    .describe('hero crops to 1600x900 for heroImage, thumbnail to 1200x630 for thumbnailImage and social cards.'),
};

export function registerMediaTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    'upload_image',
    {
      title: 'Upload image from URL',
      description:
        'Copies an image from a public https URL into the workspace media library and returns the URL to use on a page.',
      inputSchema: { ...imageInput, url: z.string().url().describe('A public https image URL.') },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    ({ workspaceId, url, name, alt, variant }) =>
      runTool(async () => {
        await requireWorkspace(ctx, workspaceId);
        const item = await importRemoteImage(workspaceId, ctx.userId, { url, name, alt });
        return imageForPage(item, variant);
      })
  );

  if (cloudflareReady()) {
    server.registerTool(
      'generate_image',
      {
        title: 'Generate image',
        description:
          'Creates an image from a text prompt, saves it to the media library and returns the URL to use on a page. Use for hero and thumbnail images.',
        inputSchema: {
          ...imageInput,
          prompt: z
            .string()
            .min(10)
            .max(2000)
            .describe(
              'A concrete visual description: subject, setting, style, lighting, composition. Ask for no text, letters or logos in the image.'
            ),
        },
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      ({ workspaceId, prompt, name, alt, variant }) =>
        runTool(async () => {
          await requireWorkspace(ctx, workspaceId);

          const generated = await cloudflareImage({
            model: IMAGE_MODEL,
            prompt,
            steps: IMAGE_STEPS,
            signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
          });
          if (!generated.ok) {
            console.error('[mcp] image generation failed:', generated.status, generated.detail);
            throw new ServiceError(502, 'generation_failed', 'Image generation failed. Try again or a different prompt.');
          }

          const { items, failed } = await uploadFiles(workspaceId, ctx.userId, [
            { file: generated.dataUrl, name, alt },
          ]);
          if (!items[0]) {
            throw new ServiceError(502, 'upload_failed', failed[0]?.message ?? 'Could not store the image');
          }
          return imageForPage(items[0], variant);
        })
    );
  }

  server.registerTool(
    'list_media',
    {
      title: 'List images',
      description: 'Images already in the workspace media library, newest first, to reuse on a page.',
      inputSchema: {
        workspaceId: workspaceIdInput,
        q: z.string().optional().describe('Matches the file name.'),
        page: z.number().int().min(1).optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    ({ workspaceId, ...query }) =>
      runTool(async () => {
        await requireWorkspace(ctx, workspaceId);
        return listMedia(workspaceId, { ...query, kind: 'image' });
      })
  );
}
