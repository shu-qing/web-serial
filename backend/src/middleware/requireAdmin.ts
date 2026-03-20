import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ForbiddenError } from '../utils/errors';

/**
 * 管理员权限验证中间件
 * 检查用户是否具有管理员或超级管理员角色
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ForbiddenError('未认证');
    }

    // 检查用户角色
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new ForbiddenError('需要管理员权限');
    }

    // 检查用户状态
    if (req.user.status !== 'active') {
      throw new ForbiddenError('账号已被禁用');
    }

    next();
  } catch (error) {
    next(error);
  }
};

