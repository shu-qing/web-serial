import { Router } from 'express';
import adminController from '../controllers/adminController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// 所有路由都需要管理员权限
router.use(authenticate, requireAdmin);

// ============ 用户管理 ============
router.get('/users', adminController.getUsers.bind(adminController));
router.get('/users/:id', adminController.getUserDetail.bind(adminController));
router.put('/users/:id', adminController.updateUser.bind(adminController));
router.put('/users/:id/status', adminController.updateUserStatus.bind(adminController));
router.delete('/users/batch', adminController.deleteUsers.bind(adminController));
router.get('/users/:id/logs', adminController.getUserLogs.bind(adminController));

// ============ 系统监控 ============
router.get('/stats', adminController.getSystemStats.bind(adminController));
router.get('/sessions/active', adminController.getActiveSessions.bind(adminController));
router.get('/performance', adminController.getPerformanceMetrics.bind(adminController));

// ============ 日志查询 ============
router.get('/logs/admin', adminController.getAdminLogs.bind(adminController));
router.get('/logs/system', adminController.getSystemLogs.bind(adminController));
router.get('/logs/error', adminController.getErrorLogs.bind(adminController));

// ============ 分析统计 ============
router.get('/analytics/users/growth', adminController.getUserGrowthTrend.bind(adminController));
router.get('/analytics/errors/by-type', adminController.getErrorStatsByType.bind(adminController));
router.get('/analytics/sessions', adminController.getSessionStats.bind(adminController));

export default router;

