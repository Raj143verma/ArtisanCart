import { Router } from 'express';
import { register, login, logout, refreshToken, forgotPassword, resetPassword, changePassword, getCurrentUser } from '../controllers/auth/authController.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { validateRequest } from '../validators/validator.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validators/auth/authValidators.js';

const router = Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/logout', authMiddleware, logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), resetPassword);
router.patch('/change-password', authMiddleware, validateRequest(changePasswordSchema), changePassword);
router.get('/me', authMiddleware, getCurrentUser);

export default router;
