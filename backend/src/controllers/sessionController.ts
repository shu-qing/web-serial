import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import sessionService from '../services/sessionService';
import { success, created } from '../utils/response';

export class SessionController {
  /**
   * GET /api/sessions/my
   * 获取我创建的会话
   */
  async getMyCreatedSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { page, limit } = req.query as any;
      const { sessions, total } = await sessionService.getMyCreatedSessions(req.user.id, {
        page,
        limit,
      });

      success(res, { items: sessions, pagination: { page, limit, total } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sessions/joined
   * 获取我参与的会话
   */
  async getMyJoinedSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { page, limit } = req.query as any;
      const { sessions, total } = await sessionService.getMyJoinedSessions(req.user.id, {
        page,
        limit,
      });

      success(res, { items: sessions, pagination: { page, limit, total } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sessions/create
   * 支持登录用户和游客创建会话
   */
  async createSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || null; // 游客的 userId 为 null
      const session = await sessionService.createSession(userId, req.body);
      created(res, session);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sessions/join
   */
  async joinSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { code, password } = req.body;
      const username = req.user?.username || 'Guest';

      const result = await sessionService.joinSession(
        code,
        req.user?.id,
        username,
        password
      );

      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sessions/:id
   */
  async getSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const session = await sessionService.getSession(id);
      success(res, session);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sessions/:id/leave
   * 支持两种方式：
   * 1. 登录用户通过userId离开（自动）
   * 2. 游客通过participantId离开（需要在body中提供participantId）
   */
  async leaveSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { participantId } = req.body;

      // 如果是游客，通过participantId离开
      if (!req.user && participantId) {
        const result = await sessionService.leaveSessionByParticipantId(participantId);
        success(res, result);
        return;
      }

      // 如果是登录用户，通过userId离开
      if (req.user) {
        const result = await sessionService.leaveSession(id, req.user.id);
        success(res, result);
        return;
      }

      throw new Error('需要提供participantId或登录后操作');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sessions/:id/end
   */
  async endSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const result = await sessionService.endSession(id, req.user.id);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export default new SessionController();

