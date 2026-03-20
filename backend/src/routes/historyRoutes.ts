import { Router } from 'express';
import historyController from '../controllers/historyController';
import { validateBody, validateQuery } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { historySchema, paginationSchema } from '../utils/validation';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

router.get('/', validateQuery(paginationSchema), historyController.getHistories);
router.post('/', validateBody(historySchema), historyController.createHistory);
router.delete('/clear', historyController.clearHistories);
router.delete('/:id', historyController.deleteHistory);

export default router;

