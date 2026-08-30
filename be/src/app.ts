import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDb } from './config/db.js';
import { routes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', true);

  // Credentials so the session cookie travels with cross-origin requests
  // (frontend and backend are separate origins in dev).
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  // Serverless has no startup phase to connect in, so every request makes sure
  // the connection is up. After the first one this resolves immediately — see
  // `connectDb`.
  app.use((_req, _res, next) => {
    connectDb().then(
      () => next(),
      (error) => next(error)
    );
  });

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
