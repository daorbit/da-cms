import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 8081),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongodbUri: process.env.MONGODB_URI ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  cookieName: process.env.COOKIE_NAME ?? 'da_cms_token',
  /** Where the web app is served. On a single-domain deploy that is the public URL. */
  appUrl: (process.env.APP_URL || process.env.PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, ''),
  /** The backend's public origin, for OAuth metadata. Derived from the request when unset. */
  publicUrl: (process.env.PUBLIC_URL ?? '').replace(/\/$/, ''),

  smtpHost: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT ?? 465),
  smtpUser: process.env.SMTP_USER ?? '',

  smtpPass: process.env.SMTP_PASS ?? '',
  smtpFrom: process.env.SMTP_FROM ?? '',
  smtpFromName: process.env.SMTP_FROM_NAME ?? 'da-cms',
};
