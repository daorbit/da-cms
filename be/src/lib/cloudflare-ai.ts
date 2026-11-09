/**
 * Cloudflare Workers AI, as one chat completion.
 *
 * Cloudflare's API is not OpenAI-shaped — it takes `{ messages }` at the top
 * level and answers `{ result: { response } }` — so the translation lives here
 * rather than leaking that request shape into the route.
 */

export interface ChatRequest {
  model: string;
  messages: { role: string; content: string }[];
  maxTokens?: number;
  temperature?: number;
  /** Aborts the request when the caller's own budget runs out. */
  signal?: AbortSignal;
}

export type ChatResult =
  | { ok: true; text: string }
  | { ok: false; status: number; detail: string };

/**
 * Whether the account and token are both configured. Checked before the route
 * is offered, so a missing key is a feature that stays hidden rather than one
 * that always fails.
 */
export function cloudflareReady(): boolean {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
}

/**
 * Errors are returned rather than thrown: the caller turns them into a status
 * for the client, and none of them are exceptional enough to unwind through.
 */
type Failure = { ok: false; status: number; detail: string };

/** POSTs a JSON input to one Workers AI model, or reports what is missing. */
async function runModel(
  model: string,
  input: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Response | Failure> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!token) return { ok: false, status: 503, detail: 'no CLOUDFLARE_API_TOKEN' };
  if (!account) return { ok: false, status: 503, detail: 'no CLOUDFLARE_ACCOUNT_ID' };

  return fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
    signal,
  });
}

function requestFailure(e: unknown): Failure {
  const aborted = e instanceof Error && e.name === 'AbortError';
  return {
    ok: false,
    status: aborted ? 504 : 502,
    detail: e instanceof Error ? e.message : 'request failed',
  };
}

export async function cloudflareChat(req: ChatRequest): Promise<ChatResult> {
  try {
    const res = await runModel(
      req.model,
      { messages: req.messages, max_tokens: req.maxTokens, temperature: req.temperature },
      req.signal
    );
    if (!(res instanceof Response)) return res;

    const body = await res.text();

    // The body carries the account id in its error envelope, so it is trimmed
    // and kept for logging rather than passed back to the browser verbatim.
    if (!res.ok) return { ok: false, status: res.status, detail: body.slice(0, 300) };

    // Two shapes in the wild: the native `result.response`, and an
    // OpenAI-compatible `result.choices[]` on the newer chat models. Both are
    // accepted rather than pinned to one, since which a model returns is a
    // property of the model and changes without notice.
    const data = JSON.parse(body) as {
      result?: {
        response?: unknown;
        choices?: { message?: { content?: string } }[];
      };
    };

    // `result.response` is a string on most models but an already-parsed object
    // on some, and `String()` on that yields "[object Object]". The
    // OpenAI-shaped `choices[]` is preferred where present because it is always
    // a string; an object response is re-serialised rather than coerced.
    const raw = data.result?.choices?.[0]?.message?.content ?? data.result?.response;

    const text =
      typeof raw === 'string' ? raw : raw && typeof raw === 'object' ? JSON.stringify(raw) : '';

    if (!text.trim()) return { ok: false, status: 502, detail: 'empty completion' };

    return { ok: true, text };
  } catch (e) {
    return requestFailure(e);
  }
}

export interface ImageRequest {
  model: string;
  prompt: string;
  steps?: number;
  signal?: AbortSignal;
}

export type ImageResult = { ok: true; dataUrl: string } | Failure;

/**
 * One text-to-image generation, returned as a base64 data URL. Some models
 * answer with raw image bytes and others with `{ result: { image } }`, so both
 * are accepted.
 */
export async function cloudflareImage(req: ImageRequest): Promise<ImageResult> {
  try {
    const res = await runModel(req.model, { prompt: req.prompt, steps: req.steps }, req.signal);
    if (!(res instanceof Response)) return res;

    if (!res.ok) return { ok: false, status: res.status, detail: (await res.text()).slice(0, 300) };

    const type = (res.headers.get('content-type') ?? '').split(';')[0];
    if (type.startsWith('image/')) {
      const bytes = Buffer.from(await res.arrayBuffer()).toString('base64');
      return { ok: true, dataUrl: `data:${type};base64,${bytes}` };
    }

    const data = (await res.json()) as { result?: { image?: string } };
    const image = data.result?.image;
    if (!image) return { ok: false, status: 502, detail: 'no image in response' };

    return { ok: true, dataUrl: `data:image/jpeg;base64,${image}` };
  } catch (e) {
    return requestFailure(e);
  }
}
