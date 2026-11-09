import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { OAUTH_SCOPE, issuerUrl, mcpResourceUrl } from '../lib/oauth.js';
import { invalidInput } from '../lib/service-error.js';
import {
  decideConsent,
  describeConsent,
  exchangeToken,
  registerClient,
  revokeToken,
  startAuthorization,
  type ClientCredentials,
} from '../services/oauth.service.js';

const text = (value: unknown) => (typeof value === 'string' ? value : '');

/** RFC 9728: tells an MCP client which authorization server guards the endpoint. */
export const protectedResourceMetadata: RequestHandler = (req, res) => {
  res.json({
    resource: mcpResourceUrl(req),
    authorization_servers: [issuerUrl(req)],
    scopes_supported: [OAUTH_SCOPE],
    bearer_methods_supported: ['header'],
    resource_name: 'da-cms',
  });
};

/** RFC 8414: where to register, authorize and exchange tokens. */
export const authorizationServerMetadata: RequestHandler = (req, res) => {
  const issuer = issuerUrl(req);
  res.json({
    issuer,
    authorization_endpoint: `${issuer}/api/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    registration_endpoint: `${issuer}/api/oauth/register`,
    revocation_endpoint: `${issuer}/api/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    scopes_supported: [OAUTH_SCOPE],
  });
};

export const register: RequestHandler = async (req, res) => {
  res.status(201).json(await registerClient(req.body));
};

/** Validates the request, then hands the user to the consent screen in the app. */
export const authorize: RequestHandler = async (req, res) => {
  const outcome = await startAuthorization(req.query, mcpResourceUrl(req));
  if ('redirect' in outcome) {
    res.redirect(outcome.redirect);
    return;
  }
  res.redirect(`${env.appUrl}/oauth/consent?ticket=${encodeURIComponent(outcome.ticket)}`);
};

export const getConsent: RequestHandler = async (req, res) => {
  res.json(await describeConsent(text(req.query.ticket)));
};

const decisionSchema = z.object({
  ticket: z.string().min(1),
  approve: z.boolean(),
});

export const postConsent: RequestHandler = async (req, res) => {
  const parsed = decisionSchema.safeParse(req.body);
  if (!parsed.success) throw invalidInput(parsed.error.issues[0].message);

  const { ticket, approve } = parsed.data;
  res.json(await decideConsent(ticket, String(req.userId), approve, issuerUrl(req)));
};

/** Client credentials from HTTP Basic auth, or from the form body. */
function clientCredentials(req: Request): ClientCredentials {
  const basic = /^Basic\s+(\S+)$/i.exec(req.get('authorization') ?? '');
  if (basic) {
    const decoded = Buffer.from(basic[1], 'base64').toString('utf8');
    const at = decoded.indexOf(':');
    if (at !== -1) {
      return {
        clientId: decodeURIComponent(decoded.slice(0, at)),
        clientSecret: decodeURIComponent(decoded.slice(at + 1)),
      };
    }
  }
  return { clientId: text(req.body?.client_id), clientSecret: text(req.body?.client_secret) };
}

export const token: RequestHandler = async (req, res) => {
  const tokens = await exchangeToken(req.body ?? {}, clientCredentials(req), mcpResourceUrl(req));
  res.set('Cache-Control', 'no-store').json(tokens);
};

export const revoke: RequestHandler = async (req, res) => {
  await revokeToken(text(req.body?.token));
  res.status(200).end();
};
