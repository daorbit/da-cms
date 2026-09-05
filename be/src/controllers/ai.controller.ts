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
 * A full article's worth. The earlier 3000 was the reason long-form asks came
 * back as a few paragraphs: the model was writing to the ceiling it was given.
 */
const MAX_TOKENS = 8000;

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

Length. Unless the instruction asks for something short, a piece runs 800-1500 words
across 30-60 blocks. Never answer a "write a blog post / article / case study /
guide" instruction with fewer than 25 blocks.

Paragraphs carry that length, and this is where thin answers fail. Every paragraph
block is 60-120 words — four to six full sentences that develop one point with a
reason and an example. A one- or two-sentence paragraph is not acceptable except
as a deliberate transition. Each heading-two section holds 2-4 such paragraphs, so
a section runs 200-400 words on its own. Hitting the block count with short
paragraphs is the failure this rule exists to prevent: 30 thin blocks is a worse
answer than 30 substantial ones.

Structure. A piece of that length must contain, at minimum:
- 4-7 <h2> sections, each with <h3> subsections where the material divides
- at least one table — any comparison, any set of options, any before/after, any
  feature or pricing breakdown goes in a table rather than in prose
- at least one <ul> and at least one <ol> — steps, requirements and criteria are
  lists, not sentences separated by semicolons
- at least one callout for the caveat, prerequisite or key takeaway every real
  article has
- <strong> on the terms that matter, and a <blockquote> where a claim deserves weight

Substance. Specifics only: real numbers, named tools, concrete scenarios, actual
trade-offs. No filler openings ("In today's fast-paced world"), no throat-clearing,
no restating the title as the first sentence. Name the cost of each approach, not
only its benefit. A case study needs the situation, what was tried, what it cost,
what changed, and what the reader should copy.

Mechanics:
- Every table row has the same number of cells, and the first row is the header.
- A table has at least 3 columns and at least 4 rows, header included.
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
    'Write the full piece: 25+ blocks, 800+ words, every paragraph 60-120 words, and use tables, lists and callouts where they fit. Return the HTML fragment only.',
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
