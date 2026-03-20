import { Router } from 'express';
import sessionController from '../controllers/sessionController';
import { validateBody, validateQuery } from '../middleware/validation';
import { authenticate, optionalAuth } from '../middleware/auth';
import { sessionSchema, joinSessionSchema, paginationSchema } from '../utils/validation';

const router = Router();

// 获取会话列表（需要认证）
router.get('/my', authenticate, validateQuery(paginationSchema), sessionController.getMyCreatedSessions);
router.get('/joined', authenticate, validateQuery(paginationSchema), sessionController.getMyJoinedSessions);

// 创建会话可选认证（允许游客创建）
router.post('/create', optionalAuth, validateBody(sessionSchema), sessionController.createSession);

// 加入会话可选认证（允许游客加入）
router.post('/join', optionalAuth, validateBody(joinSessionSchema), sessionController.joinSession);

// 获取会话信息可选认证
router.get('/:id', optionalAuth, sessionController.getSession);

// 离开会话可选认证（允许游客通过participantId离开）
router.post('/:id/leave', optionalAuth, sessionController.leaveSession);

// 结束会话需要认证（仅所有者）
router.post('/:id/end', authenticate, sessionController.endSession);

export default router;

