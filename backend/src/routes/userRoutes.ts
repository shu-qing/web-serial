import { Router } from 'express';
import authController from '../controllers/authController';
import preferenceController from '../controllers/preferenceController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { preferenceSchema, updateUserSchema, changePasswordSchema } from '../utils/validation';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 用户信息路由
router.get('/profile', authController.getProfile);
router.put('/update', validateBody(updateUserSchema), authController.updateProfile);
router.post('/change-password', validateBody(changePasswordSchema), authController.changePassword);

// 用户偏好设置路由
router.get('/preference', preferenceController.getPreference);
router.put('/preference', validateBody(preferenceSchema), preferenceController.updatePreference);
router.post('/preference/reset', preferenceController.resetPreference);

export default router;

