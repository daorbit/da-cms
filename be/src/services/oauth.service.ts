import { z } from 'zod';
import { OAuthClientModel, TOKEN_AUTH_METHODS } from '../models/oauth-client.model.js';
import { OAuthCodeModel } from '../models/oauth-code.model.js';
import { OAuthRefreshTokenModel } from '../models/oauth-refresh-token.model.js';
import { signTypedToken, verifyTypedToken } from '../lib/jwt.js';
import { ServiceError } from '../lib/service-error.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  ACCESS_TOKEN_TYPE,
  CODE_TTL_MS,
  CONSENT_TICKET_TTL_SECONDS,
  CONSENT_TICKET_TYPE,
  OAUTH_SCOPE,
  OAuthError,
  REFRESH_TOKEN_TTL_MS,
  isAllowedRedirectUri,
  pkceMatches,
  randomToken,
  safeEqual,
  sha256,
  withQuery,
} from '../lib/oauth.js';

type Params = Record<string, unknown>;

const text = (value: unknown) => (typeof value === 'string' ? value : '');
const stripSlash = (value: string) => value.replace(/\/+$/, '');

const registerSchema = z.object({
  client_name: z.string().max(120).optional(),
  redirect_uris: z.array(z.string().max(2048)).min(1).max(10),
  token_endpoint_auth_method: z.enum(TOKEN_AUTH_METHODS).default('none'),
});

/** Dynamic client registration (RFC 7591). */
export async function registerClient(input: unknown) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw new OAuthError(400, 'invalid_client_metadata', parsed.error.issues[0].message);
  }

  const { client_name, redirect_uris, token_endpoint_auth_method } = parsed.data;
  const badUri = redirect_uris.find((uri) => !isAllowedRedirectUri(uri));
  if (badUri) throw new OAuthError(400, 'invalid_redirect_uri', `${badUri} is not an allowed redirect URI`);

  const clientId = randomToken(16);
  const clientSecret = token_endpoint_auth_method === 'none' ? undefined : randomToken(32);

  const client = await OAuthClientModel.create({
    clientId,
    clientSecretHash: clientSecret ? sha256(clientSecret) : '',
    clientName: client_name ?? '',
    redirectUris: redirect_uris,
    tokenEndpointAuthMethod: token_endpoint_auth_method,
  });

  return {
    client_id: clientId,
    ...(clientSecret ? { client_secret: clientSecret, client_secret_expires_at: 0 } : {}),
    client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
    client_name: client.clientName,
    redirect_uris: client.redirectUris,
    token_endpoint_auth_method: client.tokenEndpointAuthMethod,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  };
}

interface ConsentTicket {
  cid: string;
  ru: string;
  cc: string;
  st?: string;
  sc: string;
}

/**
 * Validates an authorization request. A bad client or redirect URI cannot be
 * reported to the client, so it throws; anything else goes back to the
 * client's redirect URI. On success, a signed ticket carries the request to
 * the consent screen.
 */
export async function startAuthorization(
  query: Params,
  resourceUrl: string
): Promise<{ ticket: string } | { redirect: string }> {
  const clientId = text(query.client_id);
  const redirectUri = text(query.redirect_uri);
  const state = text(query.state) || undefined;

  const client = clientId ? await OAuthClientModel.findOne({ clientId }) : null;
  if (!client) throw new OAuthError(400, 'invalid_client', 'Unknown client');
  if (!client.redirectUris.includes(redirectUri)) {
    throw new OAuthError(400, 'invalid_request', 'redirect_uri is not registered for this client');
  }

  const fail = (error: string, description: string) => ({
    redirect: withQuery(redirectUri, { error, error_description: description, state }),
  });

  if (text(query.response_type) !== 'code') {
    return fail('unsupported_response_type', 'Only the code response type is supported');
  }
  const codeChallenge = text(query.code_challenge);
  if (!codeChallenge || text(query.code_challenge_method) !== 'S256') {
    return fail('invalid_request', 'PKCE with the S256 method is required');
  }
  const resource = text(query.resource);
  if (resource && stripSlash(resource) !== stripSlash(resourceUrl)) {
    return fail('invalid_target', 'Unknown resource');
  }

  const ticket = signTypedToken<ConsentTicket>(
    CONSENT_TICKET_TYPE,
    { cid: clientId, ru: redirectUri, cc: codeChallenge, st: state, sc: OAUTH_SCOPE },
    { expiresInSeconds: CONSENT_TICKET_TTL_SECONDS }
  );
  return { ticket };
}

function readTicket(ticket: string): ConsentTicket {
  try {
    return verifyTypedToken<ConsentTicket>(CONSENT_TICKET_TYPE, ticket);
  } catch {
    throw new ServiceError(400, 'invalid_ticket', 'This sign-in request has expired. Start again from Claude.');
  }
}

/** What the consent screen shows: who is asking and where the answer goes. */
export async function describeConsent(ticket: string) {
  const { cid, ru, sc } = readTicket(ticket);
  const client = await OAuthClientModel.findOne({ clientId: cid });
  if (!client) throw new ServiceError(400, 'invalid_ticket', 'This application is no longer registered');

  return {
    clientName: client.clientName || 'An application',
    redirectHost: new URL(ru).host,
    scope: sc,
  };
}

/** Records the user's answer and returns where to send the browser next. */
export async function decideConsent(ticket: string, userId: string, approve: boolean, issuer: string) {
  const { cid, ru, cc, st, sc } = readTicket(ticket);

  if (!approve) {
    return { redirectUrl: withQuery(ru, { error: 'access_denied', state: st, iss: issuer }) };
  }

  const code = randomToken();
  await OAuthCodeModel.create({
    codeHash: sha256(code),
    clientId: cid,
    userId,
    redirectUri: ru,
    codeChallenge: cc,
    scope: sc,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  return { redirectUrl: withQuery(ru, { code, state: st, iss: issuer }) };
}

export interface ClientCredentials {
  clientId: string;
  clientSecret: string;
}

async function authenticateClient({ clientId, clientSecret }: ClientCredentials) {
  const client = clientId ? await OAuthClientModel.findOne({ clientId }) : null;
  if (!client) throw new OAuthError(401, 'invalid_client', 'Unknown client');

  if (client.tokenEndpointAuthMethod !== 'none') {
    if (!clientSecret || !safeEqual(sha256(clientSecret), client.clientSecretHash)) {
      throw new OAuthError(401, 'invalid_client', 'Client authentication failed');
    }
  }
  return client;
}

async function issueTokens(userId: string, clientId: string, scope: string, resource: string) {
  const accessToken = signTypedToken(
    ACCESS_TOKEN_TYPE,
    { userId, clientId, scope },
    { expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS, audience: resource }
  );

  const refreshToken = randomToken();
  await OAuthRefreshTokenModel.create({
    tokenHash: sha256(refreshToken),
    clientId,
    userId,
    scope,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope,
  };
}

const invalidGrant = () => new OAuthError(400, 'invalid_grant', 'The grant is invalid or has expired');

/** The token endpoint: redeems a code, or rotates a refresh token. */
export async function exchangeToken(body: Params, credentials: ClientCredentials, resource: string) {
  const grantType = text(body.grant_type);
  if (grantType !== 'authorization_code' && grantType !== 'refresh_token') {
    throw new OAuthError(400, 'unsupported_grant_type', 'Unsupported grant type');
  }

  const client = await authenticateClient(credentials);

  if (grantType === 'authorization_code') {
    const record = await OAuthCodeModel.findOneAndDelete({ codeHash: sha256(text(body.code)) });
    if (!record || record.expiresAt.getTime() < Date.now() || record.clientId !== client.clientId) {
      throw invalidGrant();
    }
    if (text(body.redirect_uri) !== record.redirectUri) throw invalidGrant();
    const verifier = text(body.code_verifier);
    if (!verifier || !pkceMatches(verifier, record.codeChallenge)) throw invalidGrant();

    return issueTokens(String(record.userId), client.clientId, record.scope, resource);
  }

  const record = await OAuthRefreshTokenModel.findOneAndDelete({
    tokenHash: sha256(text(body.refresh_token)),
  });
  if (!record || record.expiresAt.getTime() < Date.now() || record.clientId !== client.clientId) {
    throw invalidGrant();
  }
  return issueTokens(String(record.userId), client.clientId, record.scope, resource);
}

/** Revokes a refresh token. Access tokens are short-lived and simply expire. */
export async function revokeToken(token: string) {
  if (token) await OAuthRefreshTokenModel.deleteOne({ tokenHash: sha256(token) });
}

export function verifyAccessToken(token: string, resource: string): { userId: string } {
  return verifyTypedToken<{ userId: string }>(ACCESS_TOKEN_TYPE, token, resource);
}
