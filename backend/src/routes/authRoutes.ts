import { Router } from 'express';
import authController from '../controllers/authController';
import { validateBody } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { loginSchema, registerSchema, refreshTokenSchema } from '../utils/validation';

const router = Router();

// 认证路由
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refresh);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

export default router;

