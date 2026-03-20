import prisma from '../db/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { PaginationParams } from '../types';

export class HistoryService {
  /**
   * 获取发送历史列表
   */
  async getHistories(userId: string, params: PaginationParams) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [histories, total] = await Promise.all([
      prisma.sendHistory.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sendHistory.count({ where: { userId } }),
    ]);

    return { histories, total };
  }

  /**
   * 创建发送历史记录
   */
  async createHistory(userId: string, data: any) {
    const history = await prisma.sendHistory.create({
      data: {
        userId,
        content: data.content,
        encoding: data.encoding || 'utf-8',
      },
    });

    return history;
  }

  /**
   * 删除单条历史记录
   */
  async deleteHistory(id: string, userId: string) {
    const history = await prisma.sendHistory.findUnique({
      where: { id },
    });

    if (!history) {
      throw new NotFoundError('历史记录不存在');
    }

    if (history.userId !== userId) {
      throw new ForbiddenError('无权删除此历史记录');
    }

    await prisma.sendHistory.delete({
      where: { id },
    });

    return { message: '历史记录已删除' };
  }

  /**
   * 清空用户的所有历史记录
   */
  async clearHistories(userId: string) {
    const result = await prisma.sendHistory.deleteMany({
      where: { userId },
    });

    return { message: `已清空 ${result.count} 条历史记录` };
  }
}

export default new HistoryService();

