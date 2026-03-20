import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import projectService from '../services/projectService';
import { success, created, paginated } from '../utils/response';

export class ProjectController {
  /**
   * GET /api/projects
   */
  async getProjects(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { page, limit } = req.query as any;
      const { projects, total } = await projectService.getProjects(req.user.id, {
        page,
        limit,
      });

      paginated(res, projects, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/projects/:id
   */
  async getProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const project = await projectService.getProject(id, req.user.id);
      success(res, project);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/projects
   */
  async createProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const project = await projectService.createProject(req.user.id, req.body);
      created(res, project);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/projects/:id
   */
  async updateProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const project = await projectService.updateProject(id, req.user.id, req.body);
      success(res, project);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/projects/:id
   */
  async deleteProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const result = await projectService.deleteProject(id, req.user.id);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export default new ProjectController();

