import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import testLibraryService from '../services/testLibraryService';
import { success, created, paginated } from '../utils/response';

export class TestLibraryController {
  /**
   * GET /api/projects/:projectId/test-libraries
   */
  async getLibraries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { projectId } = req.params;
      const { page, limit, deviceType, protocol } = req.query as any;
      const { libraries, total } = await testLibraryService.getLibraries(req.user.id, projectId, {
        page,
        limit,
        deviceType,
        protocol,
      });

      paginated(res, libraries, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/projects/:projectId/test-libraries/get-or-create
   */
  async getOrCreateLibrary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { projectId } = req.params;
      const library = await testLibraryService.getOrCreateLibraryForProject(req.user.id, projectId);
      success(res, library);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/test-libraries/:id
   */
  async getLibrary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const library = await testLibraryService.getLibrary(id, req.user.id);
      success(res, library);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/projects/:projectId/test-libraries
   */
  async createLibrary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { projectId } = req.params;
      const library = await testLibraryService.createLibrary(req.user.id, projectId, req.body);
      created(res, library);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/test-libraries/:id
   */
  async updateLibrary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const library = await testLibraryService.updateLibrary(id, req.user.id, req.body);
      success(res, library);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/test-libraries/:id
   */
  async deleteLibrary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const result = await testLibraryService.deleteLibrary(id, req.user.id);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/test-libraries/:libraryId/suites
   */
  async getSuites(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { libraryId } = req.params;
      const suites = await testLibraryService.getSuites(libraryId, req.user.id);
      success(res, suites);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/test-suites/:id
   */
  async getSuite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const suite = await testLibraryService.getSuite(id, req.user.id);
      success(res, suite);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/test-libraries/:libraryId/suites
   */
  async createSuite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { libraryId } = req.params;
      const suite = await testLibraryService.createSuite(libraryId, req.user.id, req.body);
      created(res, suite);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/test-suites/:id
   */
  async updateSuite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const suite = await testLibraryService.updateSuite(id, req.user.id, req.body);
      success(res, suite);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/test-suites/:id
   */
  async deleteSuite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const result = await testLibraryService.deleteSuite(id, req.user.id);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/test-suites/:id/copy
   */
  async copySuite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const suite = await testLibraryService.copySuite(id, req.user.id);
      created(res, suite);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/test-suites/:suiteId/cases
   */
  async getCases(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { suiteId } = req.params;
      const cases = await testLibraryService.getCases(suiteId, req.user.id);
      success(res, cases);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/test-cases/:id
   */
  async getCase(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const testCase = await testLibraryService.getCase(id, req.user.id);
      success(res, testCase);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/test-suites/:suiteId/cases
   */
  async createCase(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { suiteId } = req.params;
      const testCase = await testLibraryService.createCase(suiteId, req.user.id, req.body);
      created(res, testCase);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/test-cases/:id
   */
  async updateCase(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const testCase = await testLibraryService.updateCase(id, req.user.id, req.body);
      success(res, testCase);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/test-cases/:id
   */
  async deleteCase(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const result = await testLibraryService.deleteCase(id, req.user.id);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/test-cases/:id/results
   */
  async createTestResult(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const result = await testLibraryService.createTestResult(id, req.user.id, req.body);
      created(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/test-cases/:id/results
   */
  async getTestResults(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const { page, limit } = req.query as any;
      const { results, total } = await testLibraryService.getTestResults(id, req.user.id, { page, limit });
      paginated(res, results, page, limit, total);
    } catch (error) {
      next(error);
    }
  }
}

export default new TestLibraryController();

