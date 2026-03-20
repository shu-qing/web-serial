import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// 创建反馈（游客和登录用户都可以）
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { type, title, description, contact, images } = req.body;

    // 验证必填字段
    if (!type || !title || !description) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段'
      });
    }

    // 验证类型
    if (!['bug', 'suggestion', 'question'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的反馈类型'
      });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: req.user?.id || null,
        type,
        title,
        description,
        contact: contact || null,
        images: images || [],
        status: 'pending'
      }
    });

    return res.json({
      success: true,
      message: '反馈提交成功',
      data: feedback
    });
  } catch (error) {
    console.error('创建反馈失败:', error);
    return res.status(500).json({
      success: false,
      message: '提交失败，请稍后重试'
    });
  }
});

// 获取反馈列表（管理员）
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    // 检查管理员权限
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问'
      });
    }

    const { status, type, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: Number(limit)
      }),
      prisma.feedback.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        feedbacks,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('获取反馈列表失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取失败'
    });
  }
});

// 更新反馈状态（管理员）
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    // 检查管理员权限
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问'
      });
    }

    const { id } = req.params;
    const { status, adminReply } = req.body;

    const feedback = await prisma.feedback.update({
      where: { id },
      data: {
        status,
        adminReply
      }
    });

    return res.json({
      success: true,
      message: '更新成功',
      data: feedback
    });
  } catch (error) {
    console.error('更新反馈失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新失败'
    });
  }
});

// 删除反馈（管理员）
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    // 检查管理员权限
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问'
      });
    }

    const { id } = req.params;

    await prisma.feedback.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除反馈失败:', error);
    return res.status(500).json({
      success: false,
      message: '删除失败'
    });
  }
});

export default router;

