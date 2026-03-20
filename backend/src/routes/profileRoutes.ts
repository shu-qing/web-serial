import { Router } from 'express';
import profileController from '../controllers/profileController';
import { validateBody, validateQuery } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { serialConfigSchema, updateSerialConfigSchema, paginationSchema } from '../utils/validation';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

router.get('/', validateQuery(paginationSchema), profileController.getProfiles);
router.get('/default', profileController.getDefaultProfile);
router.get('/:id', profileController.getProfile);
router.post('/', validateBody(serialConfigSchema), profileController.createProfile);
router.put('/:id', validateBody(updateSerialConfigSchema), profileController.updateProfile);
router.delete('/:id', profileController.deleteProfile);

export default router;

