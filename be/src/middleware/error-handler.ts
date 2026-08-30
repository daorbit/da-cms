import type { ErrorRequestHandler } from 'express';
import type { ApiError } from '../types/index.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);

  // Mongo's duplicate-key error leaks the raw driver message (collection
  // name, index spec) — worth a clean 409 instead of a 500 with internals.
  if (err && typeof err === 'object' && (err as { code?: number }).code === 11000) {
    const body: ApiError = { error: 'duplicate', message: 'That value is already in use' };
    res.status(409).json(body);
    return;
  }

  const body: ApiError = {
    error: 'internal_error',
    message: err instanceof Error ? err.message : 'Unknown error',
  };
  res.status(500).json(body);
};
