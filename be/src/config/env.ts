import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 8081),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongodbUri: process.env.MONGODB_URI ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  cookieName: process.env.COOKIE_NAME ?? 'da_cms_token',

  // Mail. Unset locally is a supported state: `mailConfigured()` gates every
  // send, so a checkout with no SMTP credentials still runs — it just logs the
  // message instead of delivering it.
  smtpHost: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT ?? 465),
  smtpUser: process.env.SMTP_USER ?? '',
  // An app password, not the account password — Gmail rejects the latter when
  // two-factor auth is on.
  smtpPass: process.env.SMTP_PASS ?? '',
  smtpFrom: process.env.SMTP_FROM ?? '',
  smtpFromName: process.env.SMTP_FROM_NAME ?? 'da-cms',
};
