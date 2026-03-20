import { Router } from 'express';
import testLibraryController from '../controllers/testLibraryController';
import { authenticate } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import {
  testLibrarySchema,
  updateTestLibrarySchema,
  testSuiteSchema,
  updateTestSuiteSchema,
  testCaseSchema,
  updateTestCaseSchema,
  testResultSchema,
  paginationSchema,
} from '../utils/validation';

const router = Router();

// 测试库路由（按项目）
router.get('/projects/:projectId/test-libraries', authenticate, validateQuery(paginationSchema), testLibraryController.getLibraries.bind(testLibraryController));
router.get('/projects/:projectId/test-libraries/get-or-create', authenticate, testLibraryController.getOrCreateLibrary.bind(testLibraryController));
router.get('/test-libraries/:id', authenticate, testLibraryController.getLibrary.bind(testLibraryController));
router.post('/projects/:projectId/test-libraries', authenticate, validateBody(testLibrarySchema), testLibraryController.createLibrary.bind(testLibraryController));
router.put('/test-libraries/:id', authenticate, validateBody(updateTestLibrarySchema), testLibraryController.updateLibrary.bind(testLibraryController));
router.delete('/test-libraries/:id', authenticate, testLibraryController.deleteLibrary.bind(testLibraryController));

// 测试单路由
router.get('/test-libraries/:libraryId/suites', authenticate, testLibraryController.getSuites.bind(testLibraryController));
router.post('/test-libraries/:libraryId/suites', authenticate, validateBody(testSuiteSchema), testLibraryController.createSuite.bind(testLibraryController));
router.get('/test-suites/:id', authenticate, testLibraryController.getSuite.bind(testLibraryController));
router.put('/test-suites/:id', authenticate, validateBody(updateTestSuiteSchema), testLibraryController.updateSuite.bind(testLibraryController));
router.delete('/test-suites/:id', authenticate, testLibraryController.deleteSuite.bind(testLibraryController));
router.post('/test-suites/:id/copy', authenticate, testLibraryController.copySuite.bind(testLibraryController));

// 测试用例路由
router.get('/test-suites/:suiteId/cases', authenticate, testLibraryController.getCases.bind(testLibraryController));
router.post('/test-suites/:suiteId/cases', authenticate, validateBody(testCaseSchema), testLibraryController.createCase.bind(testLibraryController));
router.get('/test-cases/:id', authenticate, testLibraryController.getCase.bind(testLibraryController));
router.put('/test-cases/:id', authenticate, validateBody(updateTestCaseSchema), testLibraryController.updateCase.bind(testLibraryController));
router.delete('/test-cases/:id', authenticate, testLibraryController.deleteCase.bind(testLibraryController));

// 测试结果路由
router.post('/test-cases/:id/results', authenticate, validateBody(testResultSchema), testLibraryController.createTestResult.bind(testLibraryController));
router.get('/test-cases/:id/results', authenticate, validateQuery(paginationSchema), testLibraryController.getTestResults.bind(testLibraryController));

export default router;

