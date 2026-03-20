import prisma from '../db/prisma';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { ErrorCode, PaginationParams, SerialConfig } from '../types';

export class ProfileService {
  /**
   * 获取配置列表
   */
  async getProfiles(userId: string, params: PaginationParams & { deviceId?: string }) {
    const { page, limit, deviceId } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (deviceId) {
      where.deviceId = deviceId;
    }

    const [profiles, total] = await Promise.all([
      prisma.serialProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      }),
      prisma.serialProfile.count({ where }),
    ]);

    return { profiles, total };
  }

  /**
   * 获取默认配置
   */
  async getDefaultProfile(userId: string) {
    const profile = await prisma.serialProfile.findFirst({
      where: { userId, isDefault: true },
    });

    if (!profile) {
      throw new NotFoundError('未找到默认配置');
    }

    return profile;
  }

  /**
   * 获取配置详情
   */
  async getProfile(id: string, userId: string) {
    const profile = await prisma.serialProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundError('配置不存在');
    }

    if (profile.userId !== userId) {
      throw new ForbiddenError('无权访问此配置');
    }

    return profile;
  }

  /**
   * 创建配置（使用事务保证默认配置的互斥性）
   */
  async createProfile(userId: string, data: any) {
    // 检查名称是否已存在
    const existing = await prisma.serialProfile.findUnique({
      where: {
        userId_name: {
          userId,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        ErrorCode.VALIDATION_ERROR,
        '配置名称已存在',
        { field: 'name' }
      );
    }

    // 使用事务确保默认配置的原子性操作
    const profile = await prisma.$transaction(async (tx) => {
      // 如果设置为默认，先将其他配置取消默认
      if (data.isDefault) {
        await tx.serialProfile.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // 创建新配置
      return await tx.serialProfile.create({
        data: {
          userId,
          ...data,
        },
      });
    });

    return profile;
  }

  /**
   * 更新配置（使用事务保证默认配置的互斥性）
   */
  async updateProfile(id: string, userId: string, data: any) {
    const profile = await this.getProfile(id, userId);

    // 使用事务确保默认配置的原子性操作
    const updated = await prisma.$transaction(async (tx) => {
      // 如果设置为默认，先将其他配置取消默认
      if (data.isDefault) {
        await tx.serialProfile.updateMany({
          where: { userId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }

      // 更新配置
      return await tx.serialProfile.update({
        where: { id },
        data,
      });
    });

    return updated;
  }

  /**
   * 删除配置
   */
  async deleteProfile(id: string, userId: string) {
    const profile = await this.getProfile(id, userId);

    if (profile.isDefault) {
      throw new ForbiddenError('不能删除默认配置');
    }

    await prisma.serialProfile.delete({
      where: { id },
    });

    return { message: '配置已删除' };
  }
}

export default new ProfileService();

