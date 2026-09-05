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
 * The model answers with Slate JSON rather than HTML.
 *
 * The editor's HTML serializer currently loses links, images, table cells and
 * to-do state, so asking for HTML would mean generating good content and then
 * dropping half of it on the way in. Slate JSON is what `setValue` takes, so it
 * goes into the document exactly as written.
 */
const SYSTEM = `You write content for a CMS editor. You reply with JSON only — no prose, no markdown fences.

Reply with an object: {"blocks": [ ... ]}, where each block is a Slate node.

Available blocks:
{"type":"paragraph","children":[{"text":"..."}]}
{"type":"heading-one"|"heading-two"|"heading-three","children":[{"text":"..."}]}
{"type":"bulleted-list"|"numbered-list","children":[{"type":"list-item","children":[{"text":"..."}]}]}
{"type":"block-quote","children":[{"text":"..."}]}
{"type":"code-block","language":"ts","children":[{"text":"..."}]}
{"type":"callout","variant":"info"|"warning"|"success"|"danger","children":[{"type":"paragraph","children":[{"text":"..."}]}]}
{"type":"todo","checked":false,"children":[{"text":"..."}]}
{"type":"divider","children":[{"text":""}]}
{"type":"table","children":[{"type":"table-row","children":[{"type":"table-cell","children":[{"type":"paragraph","children":[{"text":"..."}]}]}]}]}

Text marks go on the leaf: {"text":"bold bit","bold":true}. Also italic, underline, strikethrough, code — all booleans.
Links are inline: {"type":"link","url":"https://...","children":[{"text":"label"}]}

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
- 4-7 heading-two sections, each with heading-three subsections where the material divides
- at least one table — any comparison, any set of options, any before/after, any
  feature or pricing breakdown goes in a table rather than in prose
- at least one bulleted-list and at least one numbered-list — steps, requirements
  and criteria are lists, not sentences separated by semicolons
- at least one callout for the caveat, prerequisite or key takeaway every real
  article has
- bold on the terms that matter, and a block-quote where a claim deserves weight

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
- Never wrap the JSON in a code fence.
- Return the whole piece in one reply. Do not stop early or offer to continue.`;

/** Pulls the JSON object out of a reply that may still carry a fence or prose. */
function parseBlocks(text: string): unknown[] | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;

  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(body.slice(start, end + 1)) as { blocks?: unknown };
    return Array.isArray(parsed.blocks) && parsed.blocks.length ? parsed.blocks : null;
  } catch {
    return null;
  }
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
    'Write the full piece: 25+ blocks, 800+ words, every paragraph 60-120 words, and use tables, lists and callouts where they fit. Return JSON only.',
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

    const blocks = parseBlocks(result.text);
    if (!blocks) {
      detail = 'model returned unparseable content';
      continue;
    }

    res.json({ blocks });
    return;
  }

  console.error('[ai] compose failed:', detail);
  const body: ApiError = { error: 'ai_failed', message: 'Could not generate content' };
  res.status(502).json(body);
};
