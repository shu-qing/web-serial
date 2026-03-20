import { ErrorCode } from '../types';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = '未认证') {
    super(401, ErrorCode.UNAUTHORIZED, message);
  }
}

export class InvalidCredentialsError extends ApiError {
  constructor(message = '邮箱或密码错误') {
    super(401, ErrorCode.INVALID_CREDENTIALS, message);
  }
}

export class ValidationError extends ApiError {
  constructor(message = '参数验证失败', details?: any) {
    super(422, ErrorCode.VALIDATION_ERROR, message, details);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = '资源不存在') {
    super(404, ErrorCode.RESOURCE_NOT_FOUND, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = '权限不足') {
    super(403, ErrorCode.FORBIDDEN, message);
  }
}

export class ConflictError extends ApiError {
  constructor(code: ErrorCode, message: string, details?: any) {
    super(409, code, message, details);
  }
}

export class RateLimitError extends ApiError {
  constructor(message = '请求频率超限') {
    super(429, ErrorCode.RATE_LIMIT_EXCEEDED, message);
  }
}

export class ServerError extends ApiError {
  constructor(message = '服务器内部错误') {
    super(500, ErrorCode.SERVER_ERROR, message);
  }
}

