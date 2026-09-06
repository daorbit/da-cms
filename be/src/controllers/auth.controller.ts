import type { RequestHandler } from 'express';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { UserModel } from '../models/user.model.js';
import { MembershipModel } from '../models/membership.model.js';
import { WorkspaceModel } from '../models/workspace.model.js';
import { PendingSignupModel } from '../models/pending-signup.model.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/jwt.js';
import { mailConfigured, sendOtpEmail } from '../lib/mailer.js';
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

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
});

const resendSchema = z.object({ email: z.string().email() });

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** How long an emailed code stays valid. */
const OTP_TTL_MINUTES = 10;
/** Wrong guesses allowed before the code is burned and a new one is required. */
const OTP_MAX_ATTEMPTS = 5;
/** Minimum gap between sends, so resend cannot be used to send mail on demand. */
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

/**
 * A six-digit code from the crypto RNG rather than `Math.random`, which is
 * seeded predictably enough that codes could be guessed from one another.
 */
function newOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function setSessionCookie(res: Parameters<RequestHandler>[1], userId: string) {
  const token = signToken({ userId });
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function toUserResponse(user: {
  _id: unknown;
  email: string;
  name: string;
  jobRole?: string;
  teamSize?: string;
  onboardedAt?: Date | null;
}) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    jobRole: user.jobRole ?? '',
    teamSize: user.teamSize ?? '',
    // The frontend routes on this: a user who has finished onboarding is never
    // sent back through it.
    onboardedAt: user.onboardedAt ?? null,
  };
}

/**
 * Step one of signup: hold the details and email a code.
 *
 * No account and no session yet — an address the requester does not control
 * must not become a usable login, so nothing exists until the code comes back.
 */
export const signup: RequestHandler = async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { email, password, name } = parsed.data;

  if (await UserModel.exists({ email })) {
    const body: ApiError = {
      error: 'email_taken',
      message: 'An account with that email already exists',
    };
    res.status(409).json(body);
    return;
  }

  // Without a working transport the code could never arrive, and the account
  // would be stranded half-created. Say so rather than accepting the signup.
  if (!mailConfigured()) {
    const body: ApiError = {
      error: 'mail_unavailable',
      message: 'Email is not configured, so the verification code cannot be sent',
    };
    res.status(503).json(body);
    return;
  }

  const code = newOtp();
  const [passwordHash, codeHash] = await Promise.all([hashPassword(password), hashPassword(code)]);

  // Starting again replaces any earlier attempt, so a fresh code is the only
  // one that works and the attempt count resets with it.
  await PendingSignupModel.findOneAndUpdate(
    { email },
    {
      email,
      passwordHash,
      name,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date(),
    },
    { upsert: true, new: true }
  );

  try {
    await sendOtpEmail({ email, name }, code, OTP_TTL_MINUTES);
  } catch {
    // The record would otherwise sit there holding the address with a code
    // nobody received, and the cooldown would block an immediate retry.
    await PendingSignupModel.deleteOne({ email });
    const body: ApiError = {
      error: 'mail_failed',
      message: 'Could not send the verification code. Check the address and try again.',
    };
    res.status(502).json(body);
    return;
  }

  res.status(202).json({ pending: true, email, expiresInMinutes: OTP_TTL_MINUTES });
};

/**
 * Step two: exchange a correct code for the account and a session.
 *
 * Failures are deliberately vague about which part was wrong — a message that
 * distinguished "no such signup" from "wrong code" would confirm which
 * addresses have one pending.
 */
export const verifySignup: RequestHandler = async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { email, code } = parsed.data;
  const invalid: ApiError = {
    error: 'invalid_code',
    message: 'That code is not valid. Request a new one and try again.',
  };

  const pending = await PendingSignupModel.findOne({ email });
  // The TTL index sweeps on its own schedule, so an expired record can still be
  // here — check the date rather than trusting its absence.
  if (!pending || pending.expiresAt.getTime() < Date.now()) {
    res.status(400).json(invalid);
    return;
  }

  if (pending.attempts >= OTP_MAX_ATTEMPTS) {
    await PendingSignupModel.deleteOne({ _id: pending._id });
    res.status(429).json({
      error: 'too_many_attempts',
      message: 'Too many incorrect codes. Start the signup again.',
    } satisfies ApiError);
    return;
  }

  if (!(await verifyPassword(code, pending.codeHash))) {
    await PendingSignupModel.updateOne({ _id: pending._id }, { $inc: { attempts: 1 } });
    res.status(400).json(invalid);
    return;
  }

  // Someone may have registered the address while this code was outstanding.
  if (await UserModel.exists({ email })) {
    await PendingSignupModel.deleteOne({ _id: pending._id });
    const body: ApiError = {
      error: 'email_taken',
      message: 'An account with that email already exists',
    };
    res.status(409).json(body);
    return;
  }

  const user = await UserModel.create({
    email: pending.email,
    passwordHash: pending.passwordHash,
    name: pending.name,
  });
  // Consumed: the same code must not create a second account.
  await PendingSignupModel.deleteOne({ _id: pending._id });

  setSessionCookie(res, String(user._id));
  res.status(201).json({ user: toUserResponse(user) });
};

/** Sends a fresh code for a signup already in progress. */
export const resendSignupCode: RequestHandler = async (req, res) => {
  const parsed = resendSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { email } = parsed.data;
  const pending = await PendingSignupModel.findOne({ email });

  // Answered the same way whether or not a signup is pending, so this cannot be
  // used to test which addresses have one.
  const accepted = { sent: true, expiresInMinutes: OTP_TTL_MINUTES };
  if (!pending) {
    res.status(202).json(accepted);
    return;
  }

  const since = Date.now() - pending.lastSentAt.getTime();
  if (since < OTP_RESEND_COOLDOWN_MS) {
    res.status(429).json({
      error: 'resend_too_soon',
      message: `Wait ${Math.ceil((OTP_RESEND_COOLDOWN_MS - since) / 1000)}s before requesting another code`,
    } satisfies ApiError);
    return;
  }

  const code = newOtp();
  await PendingSignupModel.updateOne(
    { _id: pending._id },
    {
      codeHash: await hashPassword(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      // The new code starts with a clean budget; the old one is gone.
      attempts: 0,
      lastSentAt: new Date(),
    }
  );

  try {
    await sendOtpEmail({ email, name: pending.name }, code, OTP_TTL_MINUTES);
  } catch {
    const body: ApiError = {
      error: 'mail_failed',
      message: 'Could not send the verification code. Try again shortly.',
    };
    res.status(502).json(body);
    return;
  }

  res.status(202).json(accepted);
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

const profileSchema = z.object({
  jobRole: z.string().max(60).optional(),
  teamSize: z.string().max(30).optional(),
  /** Sent by the final onboarding step to close the flow for good. */
  onboarded: z.boolean().optional(),
});

/** Onboarding's profile step. Every field optional — the step is skippable. */
export const updateProfile: RequestHandler = async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    const body: ApiError = { error: 'invalid_input', message: parsed.error.issues[0].message };
    res.status(400).json(body);
    return;
  }

  const { jobRole, teamSize, onboarded } = parsed.data;
  const update: Record<string, unknown> = {};
  if (jobRole !== undefined) update.jobRole = jobRole;
  if (teamSize !== undefined) update.teamSize = teamSize;
  // Stamped once. Re-running the flow should not move the date.
  if (onboarded) update.onboardedAt = new Date();

  const user = await UserModel.findByIdAndUpdate(req.userId, update, { new: true });
  if (!user) {
    const body: ApiError = { error: 'unauthorized', message: 'Not signed in' };
    res.status(401).json(body);
    return;
  }

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

  const memberships = await MembershipModel.find({ userId: user._id, status: 'active' });
  const workspaces = await WorkspaceModel.find({ _id: { $in: memberships.map((m) => m.workspaceId) } });
  const roleByWorkspace = new Map(memberships.map((m) => [String(m.workspaceId), m.role]));

  res.json({
    user: toUserResponse(user),
    workspaces: workspaces.map((w) => ({
      id: String(w._id),
      name: w.name,
      slug: w.slug,
      websiteUrl: w.websiteUrl ?? '',
      role: roleByWorkspace.get(String(w._id)) ?? null,
    })),
  });
};
