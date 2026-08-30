import type { RequestHandler } from 'express';
import type { ApiError } from '../types/index.js';

export const notFound: RequestHandler = (req, res) => {
  const body: ApiError = {
    error: 'not_found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  };
  res.status(404).json(body);
};
