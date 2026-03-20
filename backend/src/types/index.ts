import { Request } from 'express';

// ========== Express 扩展 ==========
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
    status: string;
  };
  language?: string; // 用户请求的语言
  t?: (key: string, defaultText?: string) => string; // 翻译函数
}

// ========== API 响应类型 ==========
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ========== 用户相关类型 ==========
export interface UserPayload {
  id: string;
  email: string;
  username: string;
  role: string;
  isEmailVerified?: boolean;
  status: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  agreeTerms: boolean;
}

export interface TokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: UserPayload;
}

// ========== 串口配置类型 ==========
export interface SerialConfig {
  baudRate: number;
  dataBits: number;
  parity: string;
  stopBits: number;
  flowControl: string;
  lineEndingSend?: string;
  lineEndingParse?: string;
  encoding?: string;
  bufferSize?: number;
}

// ========== WebSocket 消息类型 ==========
export interface WSMessage {
  type: string;
  sessionId?: string;
  payload?: any;
  timestamp?: number;
}

export interface SignalingMessage extends WSMessage {
  type: 'offer' | 'answer' | 'candidate' | 'candidate_end';
  payload: {
    sdp?: any; // RTCSessionDescriptionInit
    candidate?: any; // RTCIceCandidateInit
    from: string;
  };
}

export interface SessionMessage extends WSMessage {
  type: 'session_join' | 'session_leave' | 'control_request' | 'control_grant' | 'control_revoke' | 'data' | 'state_sync';
}

// ========== 错误代码 ==========
export enum ErrorCode {
  // 认证错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  
  // 验证错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  
  // 资源错误
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DEFAULT_PROFILE_NOT_FOUND = 'DEFAULT_PROFILE_NOT_FOUND',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  
  // 权限错误
  FORBIDDEN = 'FORBIDDEN',
  SESSION_PASSWORD_INVALID = 'SESSION_PASSWORD_INVALID',
  SESSION_FULL = 'SESSION_FULL',
  
  // 限流错误
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // 服务器错误
  SERVER_ERROR = 'SERVER_ERROR',
}

