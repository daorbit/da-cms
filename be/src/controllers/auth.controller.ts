import type { RequestHandler } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { UserModel } from '../models/user.model.js';
import { MembershipModel } from '../models/membership.model.js';
import { WorkspaceModel } from '../models/workspace.model.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/jwt.js';
import type { ApiError } from '../types/index.js';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setSessionCookie(res: Parameters<RequestHandler>[1], userId: string) {
  const token = signToken({ userId });
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function toUserResponse(user: { _id: unknown; email: string; name: string }) {
  return { id: String(user._id), email: user.email, name: user.name };
}

export const signup: RequestHandler = async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { email, password, name } = parsed.data;
  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({ email, passwordHash, name });

  setSessionCookie(res, String(user._id));
  res.status(201).json({ user: toUserResponse(user) });
};

export const login: RequestHandler = async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { email, password } = parsed.data;
  const user = await UserModel.findOne({ email });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    const body: ApiError = { error: 'invalid_credentials', message: 'Email or password is incorrect' };
    res.status(401).json(body);
    return;
  }

  setSessionCookie(res, String(user._id));
  res.json({ user: toUserResponse(user) });
};

export const logout: RequestHandler = (_req, res) => {
  res.clearCookie(env.cookieName);
  res.status(204).end();
};

export const me: RequestHandler = async (req, res) => {
  const user = await UserModel.findById(req.userId);
  if (!user) {
    const body: ApiError = { error: 'unauthorized', message: 'Not signed in' };
    res.status(401).json(body);
    return;
  }

  const memberships = await MembershipModel.find({ userId: user._id });
  const workspaces = await WorkspaceModel.find({ _id: { $in: memberships.map((m) => m.workspaceId) } });

  res.json({
    user: toUserResponse(user),
    workspaces: workspaces.map((w) => ({ id: String(w._id), name: w.name, slug: w.slug })),
  });
};
