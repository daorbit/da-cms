import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

/**
 * Serverless invokes this export directly, so the app must exist without a
 * listening socket. The database connects per request instead of at startup —
 * see the middleware in `createApp`.
 */
export default app;

// Only when started as a real process: `vercel dev` and production both import
// the module rather than running it, and calling `listen` there would bind a
// port nothing routes to.
if (process.env.VERCEL === undefined) {
  app.listen(env.port, () => {
    console.log(`backend listening on http://localhost:${env.port}`);
  });
}
