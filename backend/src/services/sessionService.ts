import prisma from '../db/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { generateCode, hashPassword, comparePassword, addDays } from '../utils/helpers';

export class SessionService {
  /**
   * 获取我创建的会话列表
   */
  async getMyCreatedSessions(userId: string, params: any) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: { ownerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          participants: {
            select: {
              id: true,
              username: true,
              role: true,
              hasControl: true,
              hasDevice: true,
              joinedAt: true,
            },
          },
        },
      }),
      prisma.session.count({ where: { ownerId: userId } }),
    ]);

    // 过滤敏感信息
    const safeSessions = sessions.map(({ passwordHash, ...session }) => ({
      ...session,
      hasPassword: !!passwordHash,
    }));

    return { sessions: safeSessions, total };
  }

  /**
   * 获取我参与的会话列表
   */
  async getMyJoinedSessions(userId: string, params: any) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    // 通过参与者表查找会话
    const [participants, total] = await Promise.all([
      prisma.sessionParticipant.findMany({
        where: {
          userId,
          role: 'guest', // 只查询作为guest参与的会话
        },
        skip,
        take: limit,
        orderBy: { joinedAt: 'desc' },
        include: {
          session: {
            include: {
              participants: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                  hasControl: true,
                  hasDevice: true,
                  joinedAt: true,
                },
              },
            },
          },
        },
      }),
      prisma.sessionParticipant.count({
        where: {
          userId,
          role: 'guest',
        },
      }),
    ]);

    // 提取会话并过滤敏感信息
    const sessions = participants.map((p) => {
      const { passwordHash, ...session } = p.session;
      return {
        ...session,
        hasPassword: !!passwordHash,
        myRole: p.role,
        joinedAt: p.joinedAt,
      };
    });

    return { sessions, total };
  }

  /**
   * 创建会话（使用事务保证一致性）
   * 支持登录用户和游客创建会话
   */
  async createSession(userId: string | null, data: any) {
    const inviteCode = generateCode(6);
    const connectionCode = data.mode === 'bridge' ? generateCode(6) : null;

    // 如果是游客，创建或获取系统游客用户
    let actualUserId = userId;
    if (!userId) {
      // 查找或创建系统游客用户
      let guestUser = await prisma.user.findUnique({ where: { email: 'guest@system.local' } });
      if (!guestUser) {
        guestUser = await prisma.user.create({
          data: {
            email: 'guest@system.local',
            username: 'System Guest',
            authProvider: 'local',
            status: 'active',
          },
        });
      }
      actualUserId = guestUser.id;
    }

    const sessionData: any = {
      ownerId: actualUserId,
      name: data.name,
      description: data.description,
      mode: data.mode,
      inviteCode,
      connectionCode,
      controlMode: data.controlMode || 'request',
      autoAcceptControl: data.autoAcceptControl || false,
      allowChat: data.allowChat !== false,
      allowClipboard: data.allowClipboard || false,
      status: 'created',
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : addDays(new Date(), 1),
    };

    if (data.password) {
      sessionData.passwordHash = await hashPassword(data.password);
    }

    // 使用事务确保所有操作成功或全部失败
    const result = await prisma.$transaction(async (tx) => {
      // 创建会话
      const session = await tx.session.create({
        data: sessionData,
      });

      // 创建所有者参与者记录
      const ownerParticipant = await tx.sessionParticipant.create({
        data: {
          sessionId: session.id,
          userId: actualUserId,
          username: userId ? 'Owner' : 'Guest Owner',
          role: 'owner',
          hasControl: true,
          hasDevice: true,
        },
      });

      // 记录会话创建事件
      await tx.sessionEvent.create({
        data: {
          sessionId: session.id,
          userId: actualUserId,
          eventType: 'join',
          payload: {
            username: ownerParticipant.username,
            role: ownerParticipant.role,
            isOwner: true,
            isGuest: !userId,
          },
        },
      });

      return session;
    });

    return {
      id: result.id,
      name: result.name,
      description: result.description,
      mode: result.mode,
      controlMode: result.controlMode,
      status: result.status,
      inviteCode: result.inviteCode,
      connectionCode: result.connectionCode,
      inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/session/${result.id}`,
      expiresAt: result.expiresAt,
      createdAt: result.createdAt,
    };
  }

  /**
   * 加入会话
   */
  async joinSession(code: string, userId?: string, username?: string, password?: string) {
    // 通过邀请码或连接码查找会话
    const session = await prisma.session.findFirst({
      where: {
        OR: [{ inviteCode: code }, { connectionCode: code }],
        status: { in: ['created', 'active'] },
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new NotFoundError('会话不存在或已过期');
    }

    // 检查密码
    if (session.passwordHash && password) {
      const isValid = await comparePassword(password, session.passwordHash);
      if (!isValid) {
        throw new ForbiddenError('会话密码错误');
      }
    } else if (session.passwordHash && !password) {
      throw new ForbiddenError('需要会话密码');
    }

    // 检查是否已加入
    if (userId) {
      const existing = await prisma.sessionParticipant.findFirst({
        where: { sessionId: session.id, userId },
      });
      if (existing) {
        return {
          session: {
            id: session.id,
            name: session.name,
            mode: session.mode,
            status: session.status,
          },
          participant: existing,
        };
      }
    }

    // 使用事务确保加入操作的原子性
    const result = await prisma.$transaction(async (tx) => {
      // 创建参与者记录
      const participant = await tx.sessionParticipant.create({
        data: {
          sessionId: session.id,
          userId,
          username: username || 'Guest',
          role: 'guest',
          hasControl: false,
          hasDevice: session.connectionCode === code,
        },
      });

      // 记录加入事件
      await tx.sessionEvent.create({
        data: {
          sessionId: session.id,
          userId,
          eventType: 'join',
          payload: {
            username: participant.username,
            role: participant.role,
            hasDevice: participant.hasDevice,
          },
        },
      });

      // 更新会话状态为 active
      if (session.status === 'created') {
        await tx.session.update({
          where: { id: session.id },
          data: { status: 'active' },
        });
      }

      return { participant };
    });

    // 获取所有参与者列表
    const participants = await prisma.sessionParticipant.findMany({
      where: { sessionId: session.id },
      select: {
        id: true,
        userId: true,
        username: true,
        role: true,
        hasControl: true,
        hasDevice: true,
        joinedAt: true,
        lastActiveAt: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    return {
      session: {
        id: session.id,
        name: session.name,
        mode: session.mode,
        status: 'active',
        inviteCode: session.inviteCode,
      },
      participant: result.participant,
      participants, // 返回所有参与者
    };
  }

  /**
   * 获取会话详情
   */
  async getSession(id: string) {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        participants: {
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('会话不存在');
    }

    // 移除敏感信息
    const { passwordHash, ...safeSession } = session;

    return {
      ...safeSession,
      hasPassword: !!passwordHash, // 只返回是否有密码的标志
    };
  }

  /**
   * 离开会话（通过userId）- 使用事务保证一致性
   */
  async leaveSession(sessionId: string, userId: string) {
    // 先检查参与者是否存在
    const participant = await prisma.sessionParticipant.findFirst({
      where: { sessionId, userId },
    });

    if (!participant) {
      throw new NotFoundError('您不在此会话中');
    }

    // 使用事务确保操作原子性
    await prisma.$transaction(async (tx) => {
      // 删除参与者
      await tx.sessionParticipant.delete({
        where: { id: participant.id },
      });

      // 记录事件
      await tx.sessionEvent.create({
        data: {
          sessionId,
          userId,
          eventType: 'leave',
          payload: {
            username: participant.username,
            role: participant.role,
          },
        },
      });

      // 如果没有参与者了，结束会话
      const count = await tx.sessionParticipant.count({
        where: { sessionId },
      });

      if (count === 0) {
        await tx.session.update({
          where: { id: sessionId },
          data: { status: 'ended' },
        });
      }
    });

    return { message: '已离开会话' };
  }

  /**
   * 离开会话（通过participantId，支持游客）- 使用事务保证一致性
   */
  async leaveSessionByParticipantId(participantId: string) {
    const participant = await prisma.sessionParticipant.findUnique({
      where: { id: participantId },
    });

    if (!participant) {
      throw new NotFoundError('参与者不存在');
    }

    const sessionId = participant.sessionId;

    // 使用事务确保操作原子性
    await prisma.$transaction(async (tx) => {
      // 删除参与者
      await tx.sessionParticipant.delete({
        where: { id: participantId },
      });

      // 记录事件
      await tx.sessionEvent.create({
        data: {
          sessionId,
          userId: participant.userId,
          eventType: 'leave',
          payload: {
            username: participant.username,
            role: participant.role,
          },
        },
      });

      // 如果没有参与者了，结束会话
      const count = await tx.sessionParticipant.count({
        where: { sessionId },
      });

      if (count === 0) {
        await tx.session.update({
          where: { id: sessionId },
          data: { status: 'ended' },
        });
      }
    });

    return { message: '已离开会话' };
  }

  /**
   * 结束会话
   */
  async endSession(sessionId: string, userId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('会话不存在');
    }

    if (session.ownerId !== userId) {
      throw new ForbiddenError('只有所有者可以结束会话');
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'ended' },
    });

    return { message: '会话已结束' };
  }
}

export default new SessionService();

