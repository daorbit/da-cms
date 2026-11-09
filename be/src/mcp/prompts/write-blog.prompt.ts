import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BLOG_TARGETS } from '../writing-guide.js';

const line = (label: string, value?: string) => (value ? `\n${label}: ${value}` : '');

export function registerWriteBlogPrompt(server: McpServer) {
  server.registerPrompt(
    'write_blog',
    {
      title: 'Write a blog post',
      description: 'Researches, writes, illustrates and saves a complete SEO-ready blog post in da-cms.',
      argsSchema: {
        topic: z.string().describe('What the post is about.'),
        keywords: z.string().optional().describe('Primary and secondary keywords, comma-separated.'),
        audience: z.string().optional().describe('Who the post is for.'),
        length: z.string().optional().describe('Target length, e.g. "1200 words".'),
        publish: z.string().optional().describe('"yes" to publish immediately; drafts otherwise.'),
      },
    },
    ({ topic, keywords, audience, length, publish }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text:
              `Write a complete, publication-quality blog post for da-cms and save it. First call get_writing_guide and follow it exactly: ${BLOG_TARGETS.minWords}-2,000 words, ${BLOG_TARGETS.minSections}-8 sections with concrete examples, real source links, an FAQ, a hero and thumbnail image, and full SEO. After saving, fix anything the contentReport flags.` +
              `\nTopic: ${topic}` +
              line('Keywords', keywords) +
              line('Audience', audience) +
              line('Length', length) +
              `\nStatus: ${publish?.trim().toLowerCase() === 'yes' ? 'publish it' : 'save as a draft'}`,
          },
        },
      ],
    })
  );
}
