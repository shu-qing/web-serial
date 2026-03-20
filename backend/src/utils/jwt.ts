import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';

// 验证必需的环境变量
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export const generateToken = (payload: UserPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: UserPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);
};

export const verifyToken = (token: string): UserPayload => {
  return jwt.verify(token, JWT_SECRET) as UserPayload;
};

export const getTokenExpiresIn = (): number => {
  // 返回秒数
  const match = JWT_EXPIRES_IN.match(/(\d+)([dhms])/);
  if (!match) return 7 * 24 * 60 * 60; // 默认7天
  
  const [, value, unit] = match;
  const num = parseInt(value);
  
  switch (unit) {
    case 'd':
      return num * 24 * 60 * 60;
    case 'h':
      return num * 60 * 60;
    case 'm':
      return num * 60;
    case 's':
      return num;
    default:
      return 7 * 24 * 60 * 60;
  }
};

