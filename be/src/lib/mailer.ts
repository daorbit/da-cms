import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let transporter: Transporter | null = null;

/** Whether credentials are configured at all. Callers check this before sending. */
export function mailConfigured(): boolean {
  return Boolean(env.smtpUser && env.smtpPass);
}

/** The address recipients see. Falls back to the login account. */
export function mailFrom(): string {
  const address = env.smtpFrom || env.smtpUser;
  return address ? `"${env.smtpFromName}" <${address}>` : '';
}

/**
 * The shared transport, built on first use.
 *
 * `pool` keeps one authenticated connection alive across a batch, and
 * `maxMessages` lets nodemailer recycle it before the provider decides a single
 * connection has served too many.
 */
function getTransport(): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    // 465 is implicit TLS; 587 upgrades with STARTTLS instead.
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      // Gmail rejects the account password when 2FA is on — this is an app
      // password, generated per-application in the Google account settings.
      pass: env.smtpPass,
    },
    pool: true,
    maxConnections: 1,
    maxMessages: 50,
  });

  return transporter;
}

/** Confirm the credentials actually authenticate, without sending anything. */
export async function verifyMail(): Promise<void> {
  await getTransport().verify();
}

export interface Recipient {
  email: string;
  name?: string;
}

/** Send one message. A failure throws — the caller decides how loud that is. */
export async function sendOne(
  to: Recipient,
  subject: string,
  text: string,
  html?: string
): Promise<void> {
  await getTransport().sendMail({
    from: mailFrom(),
    to: to.name ? `"${to.name}" <${to.email}>` : to.email,
    subject,
    text,
    html: html ?? shell(paragraph(escapeHtml(text))),
  });
}

/* ------------------------------------------------------------- templates -- */

/**
 * The palette, in one place.
 *
 * Light, and deliberately so. A dark email bets that the client honours your
 * background colour — and Outlook's Word engine keeps the text colour while
 * dropping the background, which turns pale copy on a near-black card into pale
 * copy on white. A light palette fails in the safe direction.
 */
const C = {
  page: '#f5f6f8',
  card: '#ffffff',
  panel: '#f3f4f6',
  line: '#e5e7eb',
  text: '#111827',
  dim: '#4b5563',
  faint: '#6b7280',
  accent: '#2563eb',
} as const;

const S = { tight: 8, block: 16, section: 24, major: 32 } as const;

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function heading(text: string): string {
  return `<p style="margin:0;font-size:18px;font-weight:700;line-height:1.4;letter-spacing:-0.3px;color:${C.text};text-align:center">${text}</p>`;
}

function paragraph(html: string, top: number = S.block): string {
  return `<p style="margin:${top}px 0 0;font-size:14.5px;line-height:1.65;color:${C.dim};text-align:center">${html}</p>`;
}

function footnote(html: string): string {
  return `<p style="margin:${S.section}px 0 0;font-size:12.5px;line-height:1.6;color:${C.faint};text-align:center">${html}</p>`;
}

/**
 * The verification code.
 *
 * A quiet grey inset with weight on the digits. Colouring them would make the
 * code read as a link, and an outlined box would make it read as an empty input.
 * It is neither: it is a number to copy.
 */
function codePanel(code: string, minutes: number): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:${S.section}px 0 0">
    <tr><td class="panel" align="center" style="background:${C.panel};border-radius:10px;padding:26px 20px">
      <div style="font-size:27px;font-weight:700;letter-spacing:6px;text-indent:6px;line-height:1.25;color:${C.text};word-break:break-all">${code}</div>
    </td></tr>
  </table>
  ${paragraph(`This code expires in ${minutes} minutes.`)}`;
}

/**
 * The shell every outgoing message shares.
 *
 * Built for mail clients rather than browsers, which is why it looks dated:
 * tables instead of flexbox, inline styles instead of a stylesheet, no external
 * assets. The wordmark is text rather than an image — an image would need a CID
 * attachment on every send, and this one is two words.
 */
function shell(inner: string): string {
  return `<div style="background:${C.page};padding:40px 16px;font-family:${FONT}">
  <!--[if mso]>
  <style>
    /* Word drops border-radius and renders the backgrounds it keeps without
       antialiasing, so rounded cards come out ragged. Squaring them
       deliberately looks intentional; leaving it to Word does not. */
    .card, .panel { border-radius: 0 !important; }
  </style>
  <![endif]-->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto">
    <tr><td class="card" style="background:${C.card};border:1px solid ${C.line};border-radius:14px;padding:${S.major}px">

      <p style="margin:0 auto ${S.major}px;text-align:center;font-size:17px;font-weight:700;color:${C.text};letter-spacing:-0.3px">
        da<span style="color:${C.accent}">cms</span>
      </p>

      ${inner}
    </td></tr>
  </table>
</div>`;
}

/**
 * The signup verification email.
 *
 * The code is repeated in the subject so it is readable from a notification
 * without opening anything, and set large in the body because the common case
 * is reading it off a phone while typing on a laptop.
 */
export async function sendOtpEmail(to: Recipient, code: string, minutes: number): Promise<void> {
  const text = `Your da-cms verification code is ${code}

It expires in ${minutes} minutes. Enter it on the signup page to finish creating your account.

If you didn't try to sign up, you can ignore this email — no account has been created.`;

  const html = shell(
    `${heading('Verify your account')}
     ${paragraph('Enter this code on the signup page to finish creating your account.')}
     ${codePanel(code, minutes)}
     ${footnote("If you didn't request this code, you can safely ignore this email — no account has been created.")}`
  );

  await sendOne(to, `${code} is your da-cms verification code`, text, html);
}

/** A single primary action button, centred. */
function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:${S.section}px 0 0">
    <tr><td align="center">
      <a href="${href}" style="display:inline-block;background:${C.accent};color:#ffffff;font-size:14.5px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:9px">${label}</a>
    </td></tr>
  </table>`;
}

/**
 * Sent when an admin invites someone to a workspace. The link carries a
 * one-time token; the recipient signs in (or signs up) and accepts.
 */
export async function sendInviteEmail(
  to: Recipient,
  detail: { workspaceName: string; inviterName: string; role: string; acceptUrl: string }
): Promise<void> {
  const { workspaceName, inviterName, role, acceptUrl } = detail;

  const text = `${inviterName} invited you to join the "${workspaceName}" workspace on da-cms as ${role}.

Accept the invite: ${acceptUrl}

If you weren't expecting this, you can ignore this email.`;

  const html = shell(
    `${heading('You have been invited')}
     ${paragraph(`<strong style="color:${C.text}">${escapeHtml(inviterName)}</strong> invited you to join <strong style="color:${C.text}">${escapeHtml(workspaceName)}</strong> as ${escapeHtml(role)}.`)}
     ${ctaButton('Accept invite', acceptUrl)}
     ${footnote("If you weren't expecting this, you can safely ignore this email.")}`
  );

  await sendOne(to, `Join ${workspaceName} on da-cms`, text, html);
}

/** Sent once an account exists, so the first thing in the inbox is not a code. */
export async function sendWelcomeEmail(to: Recipient, workspaceName: string): Promise<void> {
  const text = `Welcome to da-cms.

Your workspace "${workspaceName}" is ready. Create your first page whenever you are.`;

  const html = shell(
    `${heading('Your workspace is ready')}
     ${paragraph(`<strong style="color:${C.text}">${escapeHtml(workspaceName)}</strong> is set up and waiting.`)}
     ${paragraph('Create and publish pages when you are ready.')}`
  );

  await sendOne(to, 'Welcome to da-cms', text, html);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
