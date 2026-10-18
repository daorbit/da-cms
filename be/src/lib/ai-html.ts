const BLOCK_START = /<(h[1-6]|p|ul|ol|table|blockquote|pre|div|hr|img)\b/i;

const WRAPPER_TAGS = /<\/?(?:html|head|body|article|section|main|header|footer)\b[^>]*>/gi;

const BLOCK_TAGS =
  'table|thead|tbody|tfoot|tr|td|th|ul|ol|li|div|h[1-6]|p|pre|blockquote|hr';

const PRE_BLOCK = /(<pre\b[\s\S]*?<\/pre>)/gi;

/** Markdown and attribute slips, applied only outside code blocks. */
function repairProse(html: string): string {
  return html
    .replace(/<(\/?)h1\b/gi, '<$1h2')
    .replace(/\s(?:style|id)="[^"]*"/gi, '')
    .replace(/\sclass="[^"]*"/gi, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(>])\*([^*\n]+)\*(?=[\s.,;:)<]|$)/g, '$1<em>$2</em>')
    .replace(/`([^`\n<]+)`/g, '<code>$1</code>')
    .replace(new RegExp(`>\\s+<(\\/?(?:${BLOCK_TAGS})\\b)`, 'gi'), '><$1')
    .replace(/<(p|li|h[2-6])>\s*<\/\1>/gi, '');
}

/**
 * Pulls the HTML fragment out of a completion and repairs the slips models make
 * most often, so what reaches the editor is close to its block vocabulary.
 * Returns null when there is no HTML in the reply at all.
 */
export function extractHtml(text: string): string | null {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  let body = (fenced ? fenced[1] : text).replace(WRAPPER_TAGS, '');

  const start = body.search(BLOCK_START);
  if (start === -1) return null;

  const end = body.lastIndexOf('>');
  if (end <= start) return null;
  body = body.slice(start, end + 1);

  body = body
    .split(PRE_BLOCK)
    .map((part) => (/^<pre\b/i.test(part) ? part : repairProse(part)))
    .join('');

  return body.trim() || null;
}
