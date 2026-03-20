import prisma from '../db/prisma';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { hashPassword } from '../utils/helpers';
import os from 'os';

export class AdminService {
  // ============ 用户管理 ============
  
  /**
   * 获取用户列表（支持搜索、筛选、排序）
   */
  async getUsers(filters: any = {}, pagination: any = {}) {
    const {
      search,
      role,
      status,
      authProvider,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;
    
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (role) where.role = role;
    if (status) where.status = status;
    if (authProvider) where.authProvider = authProvider;

    // 查询用户
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          username: true,
          avatar: true,
          role: true,
          status: true,
          authProvider: true,
          isEmailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              projects: true,
              testLibraries: true,
              ownedSessions: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取用户详情（包含统计数据）
   */
  async getUserDetail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        role: true,
        status: true,
        authProvider: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true,
            profiles: true,
            testLibraries: true,
            histories: true,
            ownedSessions: true,
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 获取最近的项目和会话
    const [recentProjects, recentSessions] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
      }),
      prisma.session.findMany({
        where: { ownerId: userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      ...user,
      recentProjects,
      recentSessions,
    };
  }

  /**
   * 更新用户信息
   */
  async updateUser(adminId: string, userId: string, data: any) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 不允许修改自己的角色
    if (data.role && adminId === userId) {
      throw new ForbiddenError('不能修改自己的角色');
    }

    const updateData: any = {};
    
    if (data.username) updateData.username = data.username;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.avatar) updateData.avatar = data.avatar;
    
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 记录管理员操作
    await this.logAdminAction(adminId, 'user_update', userId, 'user', {
      changes: updateData,
      targetUser: user.email,
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      role: updatedUser.role,
      status: updatedUser.status,
    };
  }

  /**
   * 更新用户状态（启用/禁用/封禁）
   */
  async updateUserStatus(adminId: string, userId: string, status: string) {
    if (!['active', 'disabled', 'banned'].includes(status)) {
      throw new ValidationError('无效的状态值');
    }

    // 不允许修改自己的状态
    if (adminId === userId) {
      throw new ForbiddenError('不能修改自己的状态');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    // 记录管理员操作
    await this.logAdminAction(adminId, 'user_status_update', userId, 'user', {
      oldStatus: user.status,
      newStatus: status,
      targetUser: user.email,
    });

    return updatedUser;
  }

  /**
   * 批量删除用户
   */
  async deleteUsers(adminId: string, userIds: string[]) {
    // 不允许删除自己
    if (userIds.includes(adminId)) {
      throw new ForbiddenError('不能删除自己的账号');
    }

    // 获取要删除的用户信息（用于日志）
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, username: true },
    });

    // 批量删除
    const result = await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });

    // 记录管理员操作
    await this.logAdminAction(adminId, 'user_batch_delete', null, 'user', {
      deletedCount: result.count,
      deletedUsers: users.map(u => ({ id: u.id, email: u.email })),
    });

    return { deletedCount: result.count };
  }

  /**
   * 获取用户操作日志
   */
  async getUserLogs(userId: string, pagination: any = {}) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where: { targetId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.adminLog.count({
        where: { targetId: userId },
      }),
    ]);

    return { logs, total, page, limit };
  }

  // ============ 系统监控 ============

  /**
   * 获取系统统计数据
   */
  async getSystemStats() {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));

    const [
      totalUsers,
      activeUsers,
      todayNewUsers,
      weekNewUsers,
      totalProjects,
      totalSessions,
      activeSessions,
      totalTestLibraries,
      todayActiveUsers,
      todayErrorCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.project.count(),
      prisma.session.count(),
      prisma.session.count({ where: { status: 'active' } }),
      prisma.testLibrary.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: todayStart } } }),
      prisma.errorLog.count({ where: { createdAt: { gte: todayStart } } }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        todayNew: todayNewUsers,
        weekNew: weekNewUsers,
        todayActive: todayActiveUsers,
      },
      content: {
        projects: totalProjects,
        testLibraries: totalTestLibraries,
      },
      sessions: {
        total: totalSessions,
        active: activeSessions,
      },
      errors: {
        todayCount: todayErrorCount,
      },
      timestamp: new Date(),
    };
  }

  /**
   * 获取活跃会话列表
   */
  async getActiveSessions(pagination: any = {}) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: { status: { in: ['created', 'active'] } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          participants: {
            select: {
              id: true,
              username: true,
              role: true,
              hasControl: true,
              hasDevice: true,
              joinedAt: true,
              lastActiveAt: true,
            },
          },
          _count: {
            select: {
              events: true,
            },
          },
        },
      }),
      prisma.session.count({ where: { status: { in: ['created', 'active'] } } }),
    ]);

    return { sessions, total, page, limit };
  }

  /**
   * 获取性能指标
   */
  async getPerformanceMetrics() {
    // 系统信息
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    // 数据库连接池状态（Prisma没有直接提供，返回基本信息）
    const dbStats = {
      connected: true,
      // Prisma内部管理连接池，这里返回一些基本统计
    };

    // 最近的错误率
    const recentErrors = await prisma.errorLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // 最近1小时
      },
    });

    return {
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpuCount: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime(),
      },
      process: {
        pid: process.pid,
        cpuUsage: {
          user: cpuUsage.user / 1000000, // 转换为毫秒
          system: cpuUsage.system / 1000000,
        },
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
        },
        uptime: process.uptime(),
      },
      database: dbStats,
      errors: {
        recentCount: recentErrors,
      },
      timestamp: new Date(),
    };
  }

  // ============ 日志查询 ============

  /**
   * 获取管理员操作日志
   */
  async getAdminLogs(filters: any = {}, pagination: any = {}) {
    const { action, adminId, targetId, startDate, endDate } = filters;
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (action) where.action = action;
    if (adminId) where.adminId = adminId;
    if (targetId) where.targetId = targetId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.adminLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  /**
   * 获取系统日志
   */
  async getSystemLogs(filters: any = {}, pagination: any = {}) {
    const { level, category, startDate, endDate } = filters;
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (level) where.level = level;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.systemLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  /**
   * 获取错误日志
   */
  async getErrorLogs(filters: any = {}, pagination: any = {}) {
    const { errorType, userId, startDate, endDate } = filters;
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (errorType) where.errorType = errorType;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.errorLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  // ============ 日志记录 ============

  /**
   * 记录管理员操作
   */
  async logAdminAction(
    adminId: string,
    action: string,
    targetId: string | null,
    targetType: string | null,
    details: any,
    ipAddress?: string
  ) {
    return await prisma.adminLog.create({
      data: {
        adminId,
        action,
        targetId,
        targetType,
        details,
        ipAddress,
      },
    });
  }

  /**
   * 记录系统事件
   */
  async logSystemEvent(
    level: 'info' | 'warning' | 'error',
    category: string,
    message: string,
    details?: any
  ) {
    return await prisma.systemLog.create({
      data: {
        level,
        category,
        message,
        details,
      },
    });
  }

  /**
   * 记录错误
   */
  async logError(
    errorType: string,
    message: string,
    stack?: string,
    request?: any,
    userId?: string
  ) {
    return await prisma.errorLog.create({
      data: {
        userId,
        errorType,
        message,
        stack,
        request,
      },
    });
  }

  // ============ 统计分析 ============

  /**
   * 获取用户增长趋势（最近7天）
   */
  async getUserGrowthTrend(days: number = 7) {
    const trend = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      trend.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }

    return trend;
  }

  /**
   * 获取错误统计（按类型）
   */
  async getErrorStatsByType(hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const errors = await prisma.errorLog.groupBy({
      by: ['errorType'],
      where: {
        createdAt: { gte: since },
      },
      _count: {
        errorType: true,
      },
      orderBy: {
        _count: {
          errorType: 'desc',
        },
      },
      take: 10,
    });

    return errors.map(e => ({
      type: e.errorType,
      count: e._count.errorType,
    }));
  }

  /**
   * 获取会话统计
   */
  async getSessionStats() {
    const [totalSessions, activeSessions, todaySessions] = await Promise.all([
      prisma.session.count(),
      prisma.session.count({ where: { status: 'active' } }),
      prisma.session.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    // 按模式分组
    const sessionsByMode = await prisma.session.groupBy({
      by: ['mode'],
      _count: {
        mode: true,
      },
    });

    return {
      total: totalSessions,
      active: activeSessions,
      today: todaySessions,
      byMode: sessionsByMode.map(s => ({
        mode: s.mode,
        count: s._count.mode,
      })),
    };
  }
}

export default new AdminService();

