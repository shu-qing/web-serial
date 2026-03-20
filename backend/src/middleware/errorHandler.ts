import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';
import { error as errorResponse } from '../utils/response';
import { ErrorCode, AuthRequest } from '../types';
import adminService from '../services/adminService';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  // 记录错误日志（异步，不阻塞响应）
  const authReq = req as AuthRequest;
  const errorType = err.name || 'UnknownError';
  const userId = authReq.user?.id;
  
  // 收集请求信息（过滤敏感字段）
  const sanitizeBody = (body: any) => {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    // 删除敏感字段
    const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'oldPassword', 'newPassword'];
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });
    return sanitized;
  };

  const requestInfo = {
    method: req.method,
    url: req.url,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
    },
    body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined,
    query: req.query,
  };

  // 异步记录错误日志
  adminService.logError(
    errorType,
    err.message,
    err.stack,
    requestInfo,
    userId
  ).catch(logErr => {
    console.error('Failed to log error:', logErr);
  });

  // 处理不同类型的错误
  if (err instanceof ApiError) {
    errorResponse(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    errorResponse(res, 401, ErrorCode.TOKEN_INVALID, 'Token 无效');
    return;
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse(res, 401, ErrorCode.TOKEN_EXPIRED, 'Token 已过期');
    return;
  }

  // 默认服务器错误
  errorResponse(
    res,
    500,
    ErrorCode.SERVER_ERROR,
    process.env.NODE_ENV === 'production'
      ? '服务器内部错误'
      : err.message
  );
};

