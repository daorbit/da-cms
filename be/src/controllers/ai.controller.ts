import type { RequestHandler } from 'express';
import { z } from 'zod';
import { cloudflareChat, cloudflareReady } from '../lib/cloudflare-ai.js';
import { COMPOSE_SYSTEM, EDIT_SYSTEM } from '../lib/ai-prompts.js';
import { extractHtml } from '../lib/ai-html.js';
import type { ApiError } from '../types/index.js';

 
 
const MODELS = [
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
];

 
const MAX_TOKENS = 2800;

const MODEL_TIMEOUT_MS = 45_000;

const TOTAL_BUDGET_MS = 60_000;

const composeSchema = z.object({
  prompt: z.string().min(1).max(2000),
  selection: z.string().max(20000).optional(),
  context: z.string().max(20000).optional(),
  images: z.array(z.string().max(6_000_000)).max(4).optional(),
  page: z
    .object({
      title: z.string().max(300).optional(),
      description: z.string().max(1000).optional(),
    })
    .optional(),
});

function pageBrief(page?: { title?: string; description?: string }): string {
  const lines = [
    page?.title?.trim() ? `Page title: ${page.title.trim()}` : '',
    page?.description?.trim() ? `Page description: ${page.description.trim()}` : '',
  ].filter(Boolean);
  return lines.join('\n');
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

  const { prompt, selection, context, page } = parsed.data;
  const brief = pageBrief(page);

  const editing = Boolean(selection?.trim());

  const parts = editing
    ? [
        brief,
        context ? `Surrounding document, for voice only:\n${context}` : '',
        `Passage to rewrite:\n${selection}`,
        `Instruction:\n${prompt}`,
        'Return only the rewritten passage as an HTML fragment using the editor blocks.',
      ].filter(Boolean)
    : [
        brief,
        context
          ? `The document so far, for voice and to avoid repeating it:\n${context}`
          : 'The document is empty so far.',
        `Instruction:\n${prompt}`,
        'Follow the instruction exactly, including any length or format it asks for. Return the HTML fragment only, using the editor blocks.',
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
        { role: 'system', content: editing ? EDIT_SYSTEM : COMPOSE_SYSTEM },
        { role: 'user', content: parts.join('\n\n') },
      ],
      maxTokens,
      temperature: editing ? 0.3 : 0.6,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!result.ok) {
      detail = result.detail;
      continue;
    }

    const html = extractHtml(result.text);
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
