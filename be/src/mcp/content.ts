import { extractHtml } from '../lib/ai-html.js';

const WORDS_PER_MINUTE = 225;

/** Repairs the slips a model makes (markdown, h1, stray attributes) so the
 *  fragment matches the editor's block vocabulary. */
export function prepareContent(html: string): string {
  return extractHtml(html) ?? html;
}

const countWords = (html: string) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

const countTag = (html: string, tag: string) => (html.match(new RegExp(`<${tag}\\b`, 'gi')) ?? []).length;

export function estimateReadingMinutes(html: string): number {
  return Math.max(1, Math.round(countWords(html) / WORDS_PER_MINUTE));
}

/**
 * Measures a saved body against the blog standard, so the model sees what is
 * missing in the tool result and can fix it with update_page.
 */
export function contentReport(html: string, targets: { minWords: number; minSections: number }) {
  const words = countWords(html);
  const sections = countTag(html, 'h2');
  const links = countTag(html, 'a');
  const hasFaq = /<h2\b[^>]*>[^<]*(faq|frequently asked)/i.test(html);

  const issues: string[] = [];
  if (words < targets.minWords) {
    issues.push(`Only ${words} words; a full post needs at least ${targets.minWords}. Expand the thinnest sections with examples and specifics.`);
  }
  if (sections < targets.minSections) {
    issues.push(`Only ${sections} <h2> sections; aim for ${targets.minSections}-8.`);
  }
  if (!hasFaq) issues.push('No "Frequently asked questions" section.');
  if (links === 0) issues.push('No links; add authoritative sources and related posts.');

  return {
    words,
    sections,
    links,
    readingMinutes: estimateReadingMinutes(html),
    meetsBlogStandard: issues.length === 0,
    issues,
  };
}
