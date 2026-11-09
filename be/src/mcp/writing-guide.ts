import { BLOCKS, WRITING_GUIDE } from '../lib/ai-prompts.js';

/** Targets a saved blog post is checked against. */
export const BLOG_TARGETS = {
  minWords: 1200,
  idealWords: 1800,
  minSections: 5,
};

export const BLOG_BRIEF = `THE DA-CMS BLOG STANDARD
Every post reads like it was written by a practitioner who has done the work, for a publication with a strict editor. It is long enough to be the best answer on the topic, and every paragraph earns its place.

LENGTH AND SHAPE
- ${BLOG_TARGETS.minWords}-2,000 words by default (aim for about ${BLOG_TARGETS.idealWords}). Shorter only when the user asks.
- Opening: 2-3 paragraphs, about 120-180 words. Name the reader's problem, why it matters now, and what they will be able to do by the end. The primary keyword appears in the first 100 words.
- Body: ${BLOG_TARGETS.minSections}-8 <h2> sections of 150-300 words each, in a logical order (why, what, how, pitfalls, examples). Use <h3> inside long sections.
- Each section includes something concrete: a worked example, a number, a named tool or method, a short scenario, or a before-and-after. No section is only general advice.
- Use at least one list for steps or options, and a table when comparing three or more things across the same attributes.
- One callout for the single most important tip or warning.
- A "Frequently asked questions" <h2> near the end with 3-5 questions as <h3>, each answered in 2-4 sentences. Pick the questions people actually search for.
- Close with a short section on the next step the reader should take. Never a summary that repeats the post.

CREDIBILITY
- Never invent statistics, studies, quotes or customers. Use a figure only when you know it is real, and link the source with <a href>. Otherwise make the point with reasoning or an example instead.
- Link 2-4 authoritative external sources (official docs, standards bodies, primary research) where they support a claim.
- Link 1-3 related posts from this workspace (found with list_pages) where they genuinely help the reader.

SEO
- Choose one primary keyword and 3-5 secondary ones before writing. Put the primary keyword in the title, the slug, the first 100 words, at least one <h2>, and the meta description. Use the secondary ones naturally in headings and body; never stuff them.
- Title: under 60 characters where possible, specific, promising a clear outcome. No clickbait.
- Meta description (seo.description): 140-160 characters, the benefit plus a reason to click.
- Slug: 3-6 words, hyphenated, the primary keyword first.
- Alt text describes what the image shows, in a full phrase.

VOICE
- Expert, plain and direct. Second person ("you") for guides. Active voice. Short sentences mixed with longer ones.
- Vary paragraph openings. Do not start consecutive paragraphs with the same word.

BEFORE SAVING, CHECK
- Word count is at least ${BLOG_TARGETS.minWords}, with at least ${BLOG_TARGETS.minSections} <h2> sections and an FAQ.
- Every claim with a number has a real source link, or the number is removed.
- The HTML uses only the editor's blocks below.

${BLOCKS}

${WRITING_GUIDE}`;
