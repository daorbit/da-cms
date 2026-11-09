import { extractHtml } from '../lib/ai-html.js';

const WORDS_PER_MINUTE = 225;

/** Repairs the slips a model makes (markdown, h1, stray attributes) so the
 *  fragment matches the editor's block vocabulary. */
export function prepareContent(html: string): string {
  return extractHtml(html) ?? html;
}

export function estimateReadingMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
