import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import historyService from '../services/historyService';
import { success, created, paginated } from '../utils/response';

export class HistoryController {
  /**
   * GET /api/history
   */
  async getHistories(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { page, limit } = req.query as any;
      const { histories, total } = await historyService.getHistories(req.user.id, {
        page,
        limit,
      });

      paginated(res, histories, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/history
   */
  async createHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const history = await historyService.createHistory(req.user.id, req.body);
      created(res, history);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/history/:id
   */
  async deleteHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const result = await historyService.deleteHistory(id, req.user.id);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/history/clear
   */
  async clearHistories(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const result = await historyService.clearHistories(req.user.id);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export default new HistoryController();

