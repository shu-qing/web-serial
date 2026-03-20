import prisma from '../db/prisma';
import { hashPassword, comparePassword } from '../utils/helpers';
import { generateToken, generateRefreshToken, getTokenExpiresIn, verifyToken } from '../utils/jwt';
import {
  InvalidCredentialsError,
  ConflictError,
  ValidationError,
} from '../utils/errors';
import { ErrorCode, TokenResponse, UserPayload } from '../types';
import { emailService } from './emailService';
import crypto from 'crypto';

export class AuthService {
  /**
   * 用户注册（使用事务保证数据一致性）
   */
  async register(
    email: string,
    username: string,
    password: string
  ): Promise<{ user: UserPayload; message: string }> {
    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError(
        ErrorCode.EMAIL_EXISTS,
        '邮箱已被注册',
        { field: 'email' }
      );
    }

    // 使用事务确保用户、配置和偏好一起创建
    const passwordHash = await hashPassword(password);
    
    // 生成邮箱验证token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时有效期
    
    console.log('[AuthService] Register user:', {
      email,
      username,
      tokenLength: emailVerifyToken.length,
      tokenPreview: emailVerifyToken.substring(0, 20) + '...',
      expiry: emailVerifyExpiry.toISOString(),
    });
    
    const user = await prisma.$transaction(async (tx) => {
      // 创建用户
      const newUser = await tx.user.create({
        data: {
          email,
          username,
          passwordHash,
          authProvider: 'email',
          isEmailVerified: false,
          emailVerifyToken,
          emailVerifyExpiry,
        },
      });

      // 创建默认配置
      await tx.serialProfile.create({
        data: {
          userId: newUser.id,
          name: 'default',
          baudRate: 115200,
          dataBits: 8,
          parity: 'none',
          stopBits: 1.0,
          flowControl: 'none',
          isDefault: true,
        },
      });

      // 创建用户偏好
      await tx.userPreference.create({
        data: {
          userId: newUser.id,
        },
      });

      return newUser;
    });

    console.log('[AuthService] User created successfully:', {
      userId: user.id,
      email: user.email,
      hasToken: !!user.emailVerifyToken,
      tokenInDB: user.emailVerifyToken?.substring(0, 20) + '...',
      tokenMatches: user.emailVerifyToken === emailVerifyToken,
    });

    // 发送验证邮件
    try {
      await emailService.sendVerificationEmail(user.email, user.username, emailVerifyToken);
      console.log('[AuthService] Verification email sent successfully to:', user.email);
    } catch (error) {
      console.error('发送验证邮件失败:', error);
      // 邮件发送失败不影响注册流程
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
      },
      message: '注册成功，请查收验证邮件',
    };
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(token: string): Promise<{ alreadyVerified?: boolean; email?: string }> {
    console.log('[AuthService] Verifying email with token:', {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...',
    });
    
    // 先查找有这个token且未过期的用户
    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyExpiry: {
          gte: new Date(),
        },
      },
    });

    console.log('[AuthService] User found:', user ? `${user.email}` : 'null');

    if (!user) {
      // 检查是否存在这个token（可能已过期或已验证）
      const tokenUser = await prisma.user.findFirst({
        where: { emailVerifyToken: token },
      });
      
      if (tokenUser) {
        console.log('[AuthService] Token exists but expired for:', tokenUser.email);
        console.log('  Expiry:', tokenUser.emailVerifyExpiry);
        console.log('  Now:', new Date());
        throw new ValidationError('验证链接已过期，请重新发送验证邮件', {});
      }
      
      // 检查是否有已验证的用户（token可能已被清空）
      // 由于token是唯一的，我们无法通过已清空的token找到用户
      // 这种情况下，提示用户可能已经验证过了
      console.log('[AuthService] Token not found - may have been already used');
      throw new ValidationError(
        '验证链接无效。如果您已经验证过邮箱，可以直接登录',
        { possiblyAlreadyVerified: true }
      );
    }

    // 检查是否已经验证过
    if (user.isEmailVerified) {
      console.log('[AuthService] User already verified:', user.email);
      return { alreadyVerified: true, email: user.email };
    }

    // 更新用户状态
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });

    console.log('[AuthService] Email verified successfully for:', user.email);

    // 发送欢迎邮件
    try {
      await emailService.sendWelcomeEmail(user.email, user.username);
    } catch (error) {
      console.error('发送欢迎邮件失败:', error);
    }

    return {};
  }

  /**
   * 重新发送验证邮件
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ValidationError(
        '用户不存在'
      );
    }

    if (user.isEmailVerified) {
      throw new ValidationError(
        '邮箱已经验证过了'
      );
    }

    // 生成新的验证token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken,
        emailVerifyExpiry,
      },
    });

    // 发送验证邮件
    await emailService.sendVerificationEmail(user.email, user.username, emailVerifyToken);
  }

  /**
   * 用户登录
   */
  async login(email: string, password: string): Promise<TokenResponse> {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    // 验证密码
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    // 检查邮箱是否已验证
    if (!user.isEmailVerified) {
      throw new ValidationError(
        '请先验证您的邮箱',
        { needVerification: true, email: user.email }
      );
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 生成 token
    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      token,
      refreshToken,
      expiresIn: getTokenExpiresIn(),
      user: payload,
    };
  }

  /**
   * 使用 refresh token 刷新 access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ token: string; refreshToken: string; expiresIn: number }> {
    try {
      // 验证 refresh token
      const decoded = verifyToken(refreshToken);
      
      // 查找用户（确认用户仍然存在且状态正常）
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new InvalidCredentialsError('用户不存在');
      }

      if (user.status !== 'active') {
        throw new InvalidCredentialsError('账号已被禁用');
      }

      // 生成新的 token 对
      const payload: UserPayload = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
      };

      const newAccessToken = generateToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      return {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: getTokenExpiresIn(),
      };
    } catch (error: any) {
      // Token 验证失败或过期
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new InvalidCredentialsError('Refresh token 无效或已过期，请重新登录');
      }
      throw error;
    }
  }

  /**
   * 获取用户信息（已过滤敏感字段）
   */
  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        authProvider: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        // 不返回 passwordHash
      },
    });

    if (!user) {
      throw new InvalidCredentialsError('用户不存在');
    }

    return user;
  }

  /**
   * 更新用户信息
   */
  async updateUserProfile(
    userId: string,
    data: { username?: string; avatar?: string }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * 修改密码
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsError('用户不存在或未设置密码');
    }

    // 验证当前密码
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError('当前密码错误');
    }

    // 加密新密码
    const newPasswordHash = await hashPassword(newPassword);

    // 更新密码
    await prisma.user.update({
      where: { id: userId },
      data: { 
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });

    return { message: '密码修改成功' };
  }
}

export default new AuthService();

