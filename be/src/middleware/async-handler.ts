import type { RequestHandler } from 'express';

/**
 * Express 4 doesn't forward a rejected promise from an async handler to
 * `errorHandler` — it just hangs the request. Wrapping every handler here
 * catches that rejection and passes it to `next`, same as a sync throw does.
 */
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
