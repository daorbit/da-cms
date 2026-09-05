import type { RequestHandler } from 'express';
import { z } from 'zod';
import { cloudflareChat, cloudflareReady } from '../lib/cloudflare-ai.js';
import type { ApiError } from '../types/index.js';

/**
 * Two models, tried in order. The 70b writes markedly better structured
 * content; the 8b is there so a busy or failing large model degrades to a
 * slower-but-working answer rather than to an error.
 */
const MODELS = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct-fp8-fast'];

/**
 * Generation time scales with how much the model writes, and at 8000 a full
 * piece took over a minute of staring at a spinner. This is a draft the writer
 * expands, so it is sized for a wait someone will actually sit through.
 */
const MAX_TOKENS = 3500;

const composeSchema = z.object({
  prompt: z.string().min(1).max(2000),
  /** What the writer had selected, when the request is "rewrite this". */
  selection: z.string().max(20000).optional(),
  /** Surrounding document, so the model matches its voice and does not repeat it. */
  context: z.string().max(20000).optional(),
});

/**
 * The model answers with HTML, which the editor parses itself.
 *
 * An earlier version asked for the editor's own Slate JSON, on the theory that
 * it skipped a lossy conversion. It did the opposite: the node type names have
 * to be described in the prompt, and a name the editor does not recognise —
 * `heading-two` where it wanted `h2` — silently degrades to a plain paragraph.
 * HTML is a vocabulary the model already knows, and the editor's own parser
 * maps it correctly, marks and tables included.
 */
const SYSTEM = `You write content for a CMS editor. You reply with an HTML fragment only — no prose before or after it, no markdown, no code fence.

Use exactly these tags:
<h1> <h2> <h3> for headings
<p> for paragraphs
<ul><li> and <ol><li> for lists
<blockquote> for a pulled-out claim
<pre><code class="language-ts"> for code
<table><thead><tr><th> then <tbody><tr><td> for tables
<div data-callout="info"> (also warning, success, danger) wrapping <p> for asides
<hr> for a section break
<strong> <em> <u> <s> <code> for inline emphasis
<a href="https://..."> for links

Never write markdown. Asterisks around a word are a bug: bold is <strong>, not **word**.

You are writing for publication. A wall of plain paragraphs is a failed answer.

Length. Unless the instruction asks otherwise, a piece runs 450-650 words across
18-28 blocks. This is a draft the writer expands, so it is tight: every sentence
earns its place, and there is no summary section restating what was just said.

Paragraphs are 40-70 words — three or four sentences that make one point and give
a reason or an example. Never a one-sentence paragraph, and never two paragraphs
saying the same thing at different lengths.

Structure. A piece of that length contains, at minimum:
- 3-4 <h2> sections
- at least one table — any comparison, any set of options, any before/after
  goes in a table rather than in prose
- at least one <ul> or <ol> — steps, requirements and criteria are lists,
  not sentences separated by semicolons
- at least one callout for the caveat or key takeaway
- <strong> on the terms that matter

Substance. Specifics only: real numbers, named tools, concrete scenarios, actual
trade-offs. No filler openings ("In today's fast-paced world"), no throat-clearing,
no restating the title as the first sentence. Name the cost of each approach, not
only its benefit. A case study needs the situation, what was tried, what it cost,
what changed, and what the reader should copy.

Mechanics:
- Every table row has the same number of cells, and the first row is the header.
- A table has 3 columns and 3-5 rows, header included.
- Vary the blocks. Never emit more than 3 paragraphs in a row without a heading,
  list, table or callout between them.
- Do not wrap the answer in a code fence, and do not emit <html>, <head> or <body>.
- Return the whole piece in one reply. Do not stop early or offer to continue.`;

/**
 * Pulls the fragment out of a reply that may still carry a fence or a sentence
 * of preamble, and strips the markdown emphasis that leaks through even with
 * the prompt forbidding it.
 */
function parseHtml(text: string): string | null {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  let body = fenced ? fenced[1] : text;

  // Anything before the first tag is the model talking to us, not content.
  const start = body.search(/<(h[1-6]|p|ul|ol|table|blockquote|pre|div|hr|img)\b/i);
  if (start === -1) return null;

  const end = body.lastIndexOf('>');
  if (end <= start) return null;
  body = body.slice(start, end + 1);

  // `**word**` renders as literal asterisks in the editor.
  body = body
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:)]|$)/g, '$1<em>$2</em>');

  // Models pretty-print their HTML, and the newlines between structural tags
  // parse as text nodes of their own — inside a table that is an empty row per
  // line break. Only whitespace *between* tags goes; whitespace inside a
  // paragraph is content.
  body = body.replace(
    />\s+<(\/?(?:table|thead|tbody|tfoot|tr|td|th|ul|ol|li|div|h[1-6]|p|pre|blockquote|hr)\b)/gi,
    '><$1'
  );

  return body.trim() || null;
}

/**
 * Writes document content from a prompt.
 *
 * Both models get one attempt each: a reply we cannot parse is as useless as no
 * reply, so an unparseable answer falls through to the next model rather than
 * reaching the editor as an error the writer cannot act on.
 */
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


  const parts = [
    selection ? `Selected text to work from:\n${selection}` : '',
    context ? `The document so far, for voice and to avoid repeating it:\n${context}` : '',
    `Instruction:\n${prompt}`,
    'Write a tight piece: about 500 words, 18-28 blocks, every paragraph 40-70 words, with a table, a list and a callout where they fit. Return the HTML fragment only.',
  ].filter(Boolean);

  let detail = 'no model answered';

  for (const model of MODELS) {
    const result = await cloudflareChat({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: parts.join('\n\n') },
      ],
      maxTokens: MAX_TOKENS,
      temperature: 0.7,
    });

    if (!result.ok) {
      detail = result.detail;
      continue;
    }

    const html = parseHtml(result.text);
    if (!html) {
      detail = 'model returned unparseable content';
      continue;
    }

    res.json({ html });
    return;
  }

  console.error('[ai] compose failed:', detail);
  const body: ApiError = { error: 'ai_failed', message: 'Could not generate content' };
  res.status(502).json(body);
};
