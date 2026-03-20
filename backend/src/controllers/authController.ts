import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import authService from '../services/authService';
import { success, created } from '../utils/response';

export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, username, password } = req.body;
      const result = await authService.register(email, username, password);
      created(res, result, req.t?.('auth.registerSuccessCheckEmail', '注册成功，请查收验证邮件') || '注册成功，请查收验证邮件');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/verify-email?token=xxx
   */
  async verifyEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      console.log('[AuthController] Email verification request:', {
        token: token ? `${token}`.substring(0, 20) + '...' : 'null',
        tokenType: typeof token,
        tokenLength: token ? `${token}`.length : 0,
      });
      
      if (!token || typeof token !== 'string') {
        throw new Error('验证链接无效');
      }
      const result = await authService.verifyEmail(token);
      
      if (result.alreadyVerified) {
        success(res, { 
          message: '邮箱已验证过，可以直接登录',
          alreadyVerified: true,
          email: result.email,
        });
      } else {
        success(res, { message: '邮箱验证成功' });
      }
    } catch (error) {
      console.error('[AuthController] Email verification failed:', error);
      next(error);
    }
  }

  /**
   * POST /api/auth/resend-verification
   */
  async resendVerification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.resendVerificationEmail(email);
      success(res, { message: '验证邮件已重新发送' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // 简单实现，客户端清除 token 即可
      success(res, { message: '已退出登录' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh
   */
  async refresh(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshAccessToken(refreshToken);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/user/profile
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('未认证');
      }
      const user = await authService.getUserProfile(req.user.id);
      success(res, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/user/update
   */
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('未认证');
      }
      const { username, avatar } = req.body;
      const user = await authService.updateUserProfile(req.user.id, {
        username,
        avatar,
      });
      success(res, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/user/change-password
   */
  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('未认证');
      }
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();

