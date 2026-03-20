import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import adminService from '../services/adminService';
import { success } from '../utils/response';

export class AdminController {
  // ============ 用户管理 ============

  /**
   * GET /api/admin/users
   * 获取用户列表
   */
  async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        search: req.query.search as string,
        role: req.query.role as string,
        status: req.query.status as string,
        authProvider: req.query.authProvider as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as string,
      };

      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await adminService.getUsers(filters, pagination);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:id
   * 获取用户详情
   */
  async getUserDetail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await adminService.getUserDetail(id);
      success(res, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/users/:id
   * 更新用户信息
   */
  async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const user = await adminService.updateUser(req.user.id, id, req.body);
      success(res, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/users/:id/status
   * 更新用户状态
   */
  async updateUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const { status } = req.body;

      const user = await adminService.updateUserStatus(req.user.id, id, status);
      success(res, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/users/batch
   * 批量删除用户
   */
  async deleteUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('用户ID列表不能为空');
      }

      const result = await adminService.deleteUsers(req.user.id, userIds);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:id/logs
   * 获取用户操作日志
   */
  async getUserLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      };

      const result = await adminService.getUserLogs(id, pagination);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ============ 系统监控 ============

  /**
   * GET /api/admin/stats
   * 获取系统统计
   */
  async getSystemStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getSystemStats();
      success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/sessions/active
   * 获取活跃会话列表
   */
  async getActiveSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await adminService.getActiveSessions(pagination);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/performance
   * 获取性能指标
   */
  async getPerformanceMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const metrics = await adminService.getPerformanceMetrics();
      success(res, metrics);
    } catch (error) {
      next(error);
    }
  }

  // ============ 日志查询 ============

  /**
   * GET /api/admin/logs/admin
   * 获取管理员操作日志
   */
  async getAdminLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        action: req.query.action as string,
        adminId: req.query.adminId as string,
        targetId: req.query.targetId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      };

      const result = await adminService.getAdminLogs(filters, pagination);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/logs/system
   * 获取系统日志
   */
  async getSystemLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        level: req.query.level as string,
        category: req.query.category as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      };

      const result = await adminService.getSystemLogs(filters, pagination);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/logs/error
   * 获取错误日志
   */
  async getErrorLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        errorType: req.query.errorType as string,
        userId: req.query.userId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      };

      const result = await adminService.getErrorLogs(filters, pagination);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/analytics/users/growth
   * 获取用户增长趋势
   */
  async getUserGrowthTrend(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const trend = await adminService.getUserGrowthTrend(days);
      success(res, trend);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/analytics/errors/by-type
   * 获取错误统计（按类型）
   */
  async getErrorStatsByType(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const stats = await adminService.getErrorStatsByType(hours);
      success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/analytics/sessions
   * 获取会话统计
   */
  async getSessionStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getSessionStats();
      success(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();

