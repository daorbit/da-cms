import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface TokenPayload {
  userId: string;
}

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.jwtSecret) as TokenPayload & { typ?: string };
  // Typed tokens (OAuth access tokens, consent tickets) share the secret but
  // are never sessions.
  if (payload.typ) throw new Error('not a session token');
  return payload;
}

/** A purpose-bound token: `typ` keeps one kind from being accepted as another. */
export function signTypedToken<T extends object>(
  typ: string,
  payload: T,
  options: { expiresInSeconds: number; audience?: string }
) {
  return jwt.sign({ ...payload, typ }, env.jwtSecret, {
    expiresIn: options.expiresInSeconds,
    ...(options.audience ? { audience: options.audience } : {}),
  });
}

export function verifyTypedToken<T extends object>(typ: string, token: string, audience?: string): T {
  const payload = jwt.verify(token, env.jwtSecret, audience ? { audience } : {}) as T & { typ?: string };
  if (payload.typ !== typ) throw new Error(`not a ${typ} token`);
  return payload;
}
