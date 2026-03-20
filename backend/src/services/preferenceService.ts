import prisma from '../db/prisma';
import { NotFoundError } from '../utils/errors';

export class PreferenceService {
  /**
   * 获取用户偏好设置（如果不存在则自动创建默认设置）
   */
  async getPreference(userId: string) {
    let preference = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      // 自动创建默认偏好设置
      console.log(`Creating default preference for user: ${userId}`);
      preference = await prisma.userPreference.create({
        data: {
          userId,
          theme: 'light',
          fontSize: 14,
          fontFamily: 'Monaco',
          lineHeight: 'normal',
          autoScroll: true,
          showLineNumber: false,
          timestampFormat: 'HH:mm:ss.SSS',
        },
      });
    }

    return preference;
  }

  /**
   * 更新用户偏好设置
   */
  async updatePreference(userId: string, data: any) {
    // 先检查是否存在
    const existing = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!existing) {
      // 如果不存在，创建新的（正常情况下注册时已创建）
      return await prisma.userPreference.create({
        data: {
          userId,
          ...data,
        },
      });
    }

    // 更新现有的
    return await prisma.userPreference.update({
      where: { userId },
      data,
    });
  }

  /**
   * 重置为默认设置
   */
  async resetPreference(userId: string) {
    return await prisma.userPreference.update({
      where: { userId },
      data: {
        theme: 'light',
        fontSize: 14,
        fontFamily: 'Monaco',
        lineHeight: 'normal',
        autoScroll: true,
        showLineNumber: false,
        timestampFormat: 'HH:mm:ss.SSS',
      },
    });
  }
}

export default new PreferenceService();

