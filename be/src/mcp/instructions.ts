import { BLOG_BRIEF } from './writing-guide.js';

export const BLOG_WORKFLOW = `WRITING A BLOG POST OR PAGE
1. Workspace: call list_workspaces. If there is more than one and the user has not named one, ask which.
2. Brief: call get_writing_guide and follow it. It sets the length, structure, SEO and HTML rules every post is held to.
3. Context: call get_workspace_context. Use only its group and tag names; put posts in the blog group when there is one.
4. Research: call list_pages with the topic as q, to avoid duplicating a post and to find related posts to link to.
5. Plan, then write: pick the primary and secondary keywords and outline the <h2> sections first, then write the full post in one pass. Never send a shortened draft or placeholder text.
6. Images: create a hero image (variant "hero") and a thumbnail (variant "thumbnail"). Use generate_image when it is available, with a concrete prompt that asks for no text in the image; otherwise upload_image with a URL the user gave, or reuse one from list_media.
7. SEO: fill seo.title, seo.description, 5-8 keywords, ogType "article" and twitterCard "summary_large_image". ogImage defaults to the thumbnail.
8. Save with create_page as a draft, unless the user asked to publish. Read the contentReport it returns: if meetsBlogStandard is false, fix every issue with update_page before replying.
9. Reply with the title, a one-line summary, the word count and the editorUrl.

Editing an existing page: get_page, then update_page with only the fields that change.`;

export const MCP_INSTRUCTIONS = `da-cms is a headless content management system. These tools write, illustrate, optimise and publish pages and blog posts in the user's workspaces, acting as the signed-in user.

${BLOG_WORKFLOW}

${BLOG_BRIEF}`;
