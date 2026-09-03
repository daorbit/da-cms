import { Router } from 'express';
import { signup, login, logout, me, updateProfile } from '../controllers/auth.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/require-auth.js';

export const authRoutes = Router();

authRoutes.post('/signup', asyncHandler(signup));
authRoutes.post('/login', asyncHandler(login));
authRoutes.post('/logout', logout);
authRoutes.get('/me', requireAuth, asyncHandler(me));
authRoutes.patch('/profile', requireAuth, asyncHandler(updateProfile));
