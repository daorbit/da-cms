import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * One connection per process, reused across invocations.
 *
 * Serverless keeps a warm container between requests, so a fresh `connect` per
 * request would open connections faster than Atlas retires them and exhaust the
 * pool. The promise is cached, not the result: concurrent cold requests then
 * await the same in-flight connection rather than starting several.
 */
let pending: Promise<typeof mongoose> | null = null;

export function connectDb() {
  if (!env.mongodbUri) {
    console.warn('MONGODB_URI not set, skipping db connection');
    return Promise.resolve(null);
  }

  // 1 = connected, 2 = connecting.
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);

  if (!pending) {
    pending = mongoose.connect(env.mongodbUri).catch((error) => {
      // Cleared so the next request retries rather than reusing a failure.
      pending = null;
      throw error;
    });
  }

  return pending;
}
