import prisma from '../db/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { PaginationParams } from '../types';

export class ProjectService {
  /**
   * 获取项目列表
   */
  async getProjects(userId: string, params: PaginationParams) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.project.count({ where: { userId } }),
    ]);

    return { projects, total };
  }

  /**
   * 获取项目详情
   */
  async getProject(id: string, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundError('项目不存在');
    }

    if (project.userId !== userId) {
      throw new ForbiddenError('无权访问此项目');
    }

    return project;
  }

  /**
   * 创建项目
   */
  async createProject(userId: string, data: any) {
    const project = await prisma.project.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        config: data.config || {},
      },
    });

    return project;
  }

  /**
   * 更新项目
   */
  async updateProject(id: string, userId: string, data: any) {
    await this.getProject(id, userId);

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        config: data.config,
      },
    });

    return updated;
  }

  /**
   * 删除项目
   */
  async deleteProject(id: string, userId: string) {
    await this.getProject(id, userId);

    await prisma.project.delete({
      where: { id },
    });

    return { message: '项目已删除' };
  }
}

export default new ProjectService();

