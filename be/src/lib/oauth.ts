import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { env } from '../config/env.js';

export const OAUTH_SCOPE = 'cms';
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const CODE_TTL_MS = 5 * 60 * 1000;
export const CONSENT_TICKET_TTL_SECONDS = 10 * 60;

export const ACCESS_TOKEN_TYPE = 'mcp_access';
export const CONSENT_TICKET_TYPE = 'oauth_consent';

/** An OAuth protocol error, rendered as `{ error, error_description }`. */
export class OAuthError extends Error {
  readonly status: number;
  readonly error: string;

  constructor(status: number, error: string, description: string) {
    super(description);
    this.status = status;
    this.error = error;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** PKCE S256: the challenge is the base64url SHA-256 of the verifier. */
export function pkceMatches(verifier: string, challenge: string): boolean {
  const computed = createHash('sha256').update(verifier).digest('base64url');
  return safeEqual(computed, challenge);
}

/** The backend's public origin — the OAuth issuer. */
export function issuerUrl(req: Request): string {
  return env.publicUrl || `${req.protocol}://${req.get('host')}`;
}

/** The MCP endpoint, which access tokens are issued for. */
export function mcpResourceUrl(req: Request): string {
  return `${issuerUrl(req)}/api/mcp`;
}

export function protectedResourceMetadataUrl(req: Request): string {
  return `${issuerUrl(req)}/.well-known/oauth-protected-resource/api/mcp`;
}

/** Redirect URIs must be https, except loopback addresses for local clients. */
export function isAllowedRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.hash) return false;
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function withQuery(base: string, params: Record<string, string | undefined>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.toString();
}
