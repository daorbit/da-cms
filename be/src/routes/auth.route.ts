import { Router } from 'express';
import {
  signup,
  verifySignup,
  resendSignupCode,
  login,
  logout,
  me,
  updateProfile,
  changePassword,
} from '../controllers/auth.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/require-auth.js';

export const authRoutes = Router();

// Signup is two steps: /signup emails a code, /signup/verify redeems it for the
// account and the session.
authRoutes.post('/signup', asyncHandler(signup));
authRoutes.post('/signup/verify', asyncHandler(verifySignup));
authRoutes.post('/signup/resend', asyncHandler(resendSignupCode));
authRoutes.post('/login', asyncHandler(login));
authRoutes.post('/logout', logout);
authRoutes.get('/me', requireAuth, asyncHandler(me));
authRoutes.patch('/profile', requireAuth, asyncHandler(updateProfile));
authRoutes.post('/password', requireAuth, asyncHandler(changePassword));
