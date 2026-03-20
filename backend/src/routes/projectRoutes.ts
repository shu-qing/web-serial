import { Router } from 'express';
import projectController from '../controllers/projectController';
import { validateBody, validateQuery } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { projectSchema, updateProjectSchema, paginationSchema } from '../utils/validation';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

router.get('/', validateQuery(paginationSchema), projectController.getProjects);
router.get('/:id', projectController.getProject);
router.post('/', validateBody(projectSchema), projectController.createProject);
router.put('/:id', validateBody(updateProjectSchema), projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

export default router;

