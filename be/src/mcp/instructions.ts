import { BLOCKS, WRITING_GUIDE } from '../lib/ai-prompts.js';

export const BLOG_WORKFLOW = `WRITING A BLOG POST OR PAGE
1. Workspace: call list_workspaces. If there is more than one and the user has not named one, ask which.
2. Context: call get_workspace_context. Use only its group and tag names; put posts in the blog group when there is one.
3. Research: call list_pages with the topic as q, to avoid duplicating a post and to find related posts worth linking to.
4. Write the post:
   - title: under 70 characters, specific, primary keyword included.
   - slug: 3-6 lowercase hyphenated words.
   - description: 140-200 characters, the promise of the post.
   - content: an HTML fragment in the editor's blocks below, 900-1500 words unless the user gives a length.
5. Images: create a hero image (variant "hero") and a thumbnail (variant "thumbnail"). Use generate_image when it is available, with a concrete prompt that asks for no text in the image; otherwise upload_image with a URL the user gave, or reuse one from list_media. Write alt text for both.
6. SEO: seo.title 50-60 characters, seo.description 140-160 characters, 5-8 keywords, ogType "article", twitterCard "summary_large_image". ogImage defaults to the thumbnail.
7. Save with create_page as a draft, unless the user asked to publish. Reply with the title, a one-line summary and the editorUrl.

Editing an existing page: get_page, then update_page with only the fields that change.`;

export const MCP_INSTRUCTIONS = `da-cms is a headless content management system. These tools write, illustrate, optimise and publish pages and blog posts in the user's workspaces, acting as the signed-in user.

${BLOG_WORKFLOW}

${BLOCKS}

${WRITING_GUIDE}`;
