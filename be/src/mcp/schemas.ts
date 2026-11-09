import { z } from 'zod';

export const workspaceIdInput = z
  .string()
  .describe('The workspace id, from list_workspaces.');

export const pageIdInput = z.string().describe('The page id, from list_pages or create_page.');

const imageInput = z.object({
  url: z.string().url().describe('The image URL, from generate_image or upload_image.'),
  alt: z.string().max(300).describe('What the image shows, for screen readers and image search.'),
});

const seoInput = z
  .object({
    title: z
      .string()
      .max(200)
      .describe('Search result title, 50-60 characters, primary keyword near the start. Defaults to the page title.'),
    description: z
      .string()
      .max(400)
      .describe('Meta description, 140-160 characters, with the primary keyword and a reason to click.'),
    keywords: z.string().max(300).describe('5-8 comma-separated keyword phrases.'),
    canonicalUrl: z.string().url().describe('Only when this content also lives at another URL.'),
    ogTitle: z.string().max(200).describe('Social card title. Defaults to the SEO title.'),
    ogDescription: z.string().max(400).describe('Social card description. Defaults to the SEO description.'),
    ogImage: z.string().url().describe('Social card image. Defaults to the thumbnail image.'),
    ogType: z.enum(['article', 'website']).describe('article for a blog post, website for a landing page.'),
    twitterCard: z.enum(['summary_large_image', 'summary']),
    noIndex: z.boolean().describe('Hide from search engines.'),
    noFollow: z.boolean().describe('Ask search engines not to follow links.'),
  })
  .partial();

const authorInput = z.object({
  name: z.string().max(120),
  role: z.string().max(120).default(''),
});

export const pageFieldsInput = {
  title: z.string().min(1).max(200).describe('The headline, shown as the page h1. Under 70 characters.'),
  slug: z
    .string()
    .max(200)
    .optional()
    .describe('URL path segment, lowercase and hyphenated, 3-6 words. Defaults to the title.'),
  description: z
    .string()
    .max(500)
    .optional()
    .describe('One or two sentence summary shown in listings, 140-200 characters.'),
  content: z
    .string()
    .optional()
    .describe("The body as an HTML fragment in the editor's block vocabulary. No h1, no markdown."),
  group: z.string().max(60).optional().describe('One group name from get_workspace_context, e.g. the blog group.'),
  tags: z
    .array(z.string().max(60))
    .max(50)
    .optional()
    .describe('Tag names from get_workspace_context. Only existing tags are accepted.'),
  heroImage: imageInput.optional().describe('Wide banner at the top of the page (hero variant).'),
  thumbnailImage: imageInput.optional().describe('Card image for listings and social previews (thumbnail variant).'),
  seo: seoInput.optional(),
  author: authorInput.optional().describe('The byline, only when the user names one.'),
  readingMinutes: z
    .number()
    .int()
    .min(0)
    .max(999)
    .optional()
    .describe('Read time in minutes. Estimated from the content when omitted.'),
  status: z
    .enum(['draft', 'published', 'archived'])
    .optional()
    .describe('Defaults to draft. Publish only when the user asks.'),
};

export const pageUpdateInput = {
  ...pageFieldsInput,
  title: pageFieldsInput.title.optional(),
};

type PageFieldsShape = typeof pageFieldsInput;

export type PageFields = Partial<{ [K in keyof PageFieldsShape]: z.infer<PageFieldsShape[K]> }>;
