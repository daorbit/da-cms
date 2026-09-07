import type { RequestHandler } from 'express';
import { z } from 'zod';
import { cloudflareChat, cloudflareReady } from '../lib/cloudflare-ai.js';
import type { ApiError } from '../types/index.js';

 
 
const MODELS = [
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
];

 
const MAX_TOKENS = 1800;

const MODEL_TIMEOUT_MS = 45_000;

const TOTAL_BUDGET_MS = 60_000;

const composeSchema = z.object({
  prompt: z.string().min(1).max(2000),
  selection: z.string().max(20000).optional(),
  context: z.string().max(20000).optional(),
  images: z.array(z.string().max(6_000_000)).max(4).optional(),
});

 
const SYSTEM = `You write content for a CMS editor. You reply with an HTML fragment only — no prose before or after it, no markdown, no code fence.

Use exactly these tags:
<h1> <h2> <h3> for headings
<p> for paragraphs
<ul><li> and <ol><li> for lists
<blockquote> for a pulled-out claim
<pre><code class="language-ts"> for code
<div data-callout="info"> (also warning, success, danger) wrapping <p> for asides
<hr> for a section break
<strong> <em> <u> <s> <code> for inline emphasis
<a href="https://..."> for links

Never write markdown. Asterisks around a word are a bug: bold is <strong>, not **word**.

You are writing for publication. Prose is the default. Well-written paragraphs
with the occasional heading carry almost every answer. A table is rare: use one
only when the user explicitly asks to compare things or asks for a table, and
never to lay out prose, steps, or a single subject's attributes. When unsure,
write a paragraph or a list, not a table.

Length. Match the instruction. A request for a line returns a line, a request for
a section returns a section. Absent any steer, write 250-350 words across 10-16
blocks. This is a draft the writer expands, so it is tight: every sentence earns
its place, and there is no summary section restating what was just said.

Paragraphs are 40-70 words — three or four sentences that make one point and give
a reason or an example. Never a one-sentence paragraph, and never two paragraphs
saying the same thing at different lengths.

Structure. Use the block that fits the content, never one that does not:
- <h2> to separate genuinely distinct sections
- a list for steps, requirements or criteria
- a callout for a real caveat, not for emphasis
- <strong> on the terms that matter
- a table only on an explicit request to compare or tabulate

Substance. Specifics only: real numbers, named tools, concrete scenarios, actual
trade-offs. No filler openings ("In today's fast-paced world"), no throat-clearing,
no restating the title as the first sentence. Name the cost of each approach, not
only its benefit. A case study needs the situation, what was tried, what it cost,
what changed, and what the reader should copy.

Mechanics:
- If a table is genuinely warranted: every row has the same number of cells, the
  first row is the header, 3 columns, 3-5 rows.
- Vary the blocks. Break up a long run of paragraphs with a heading or a list.
- Do not wrap the answer in a code fence, and do not emit <html>, <head> or <body>.
- Return the whole piece in one reply. Do not stop early or offer to continue.`;

 
const EDIT_SYSTEM = `You edit a fragment of a document. You reply with an HTML fragment only — no prose before or after it, no markdown, no code fence, no explanation of what you changed.

You are given a passage and an instruction. Return that passage rewritten, and nothing else.

Rules:
- Return only the passage. Never add headings, tables, callouts or sections that were not there.
- Match the length of the original unless the instruction asks for shorter or longer. A one-line input returns roughly one line.
- Keep the original voice, tense and person.
- Preserve the inline markup that was there: <strong> <em> <u> <s> <code> <a href>.
- If the passage was plain text with no tags, return a single <p> and nothing more.
- If it was several paragraphs, return the same number of <p> blocks.
- Never write markdown. Bold is <strong>, not **word**.`;

 
function parseHtml(text: string): string | null {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  let body = fenced ? fenced[1] : text;

  const start = body.search(/<(h[1-6]|p|ul|ol|table|blockquote|pre|div|hr|img)\b/i);
  if (start === -1) return null;

  const end = body.lastIndexOf('>');
  if (end <= start) return null;
  body = body.slice(start, end + 1);

  body = body
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:)]|$)/g, '$1<em>$2</em>');

 
  body = body.replace(
    />\s+<(\/?(?:table|thead|tbody|tfoot|tr|td|th|ul|ol|li|div|h[1-6]|p|pre|blockquote|hr)\b)/gi,
    '><$1'
  );

  return body.trim() || null;
}

 
export const composeContent: RequestHandler = async (req, res) => {
  if (!cloudflareReady()) {
    const body: ApiError = { error: 'unavailable', message: 'AI is not configured' };
    res.status(503).json(body);
    return;
  }

  const parsed = composeSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { prompt, selection, context } = parsed.data;

 
  const editing = Boolean(selection?.trim());

  const parts = editing
    ? [
        `Passage to rewrite:\n${selection}`,
        context ? `Surrounding document, for voice only:\n${context}` : '',
        `Instruction:\n${prompt}`,
        'Return only the rewritten passage as an HTML fragment.',
      ].filter(Boolean)
    : [
        context ? `The document so far, for voice and to avoid repeating it:\n${context}` : '',
        `Instruction:\n${prompt}`,
        'Follow the instruction exactly, including any length it asks for. Return the HTML fragment only.',
      ].filter(Boolean);

 
  const maxTokens = editing
    ? Math.min(MAX_TOKENS, Math.max(300, Math.ceil((selection?.length ?? 0) / 2) + 300))
    : MAX_TOKENS;

  let detail = 'no model answered';

  const startedAt = Date.now();

  for (const model of MODELS) {
    const spent = Date.now() - startedAt;
    if (spent > TOTAL_BUDGET_MS) break;

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(MODEL_TIMEOUT_MS, TOTAL_BUDGET_MS - spent)
    );

    const result = await cloudflareChat({
      model,
      messages: [
        { role: 'system', content: editing ? EDIT_SYSTEM : SYSTEM },
        { role: 'user', content: parts.join('\n\n') },
      ],
      maxTokens,
      temperature: editing ? 0.3 : 0.7,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!result.ok) {
      detail = result.detail;
      continue;
    }

    const html = parseHtml(result.text);
    if (!html) {
      detail = 'model returned unparseable content';
      continue;
    }

    res.json({ html, mode: editing ? 'replace' : 'insert' });
    return;
  }

  console.error('[ai] compose failed:', detail);
  const body: ApiError = { error: 'ai_failed', message: 'Could not generate content' };
  res.status(502).json(body);
};
