import express, { Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { i18nMiddleware } from './utils/i18n';

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import profileRoutes from './routes/profileRoutes';
import projectRoutes from './routes/projectRoutes';
import sessionRoutes from './routes/sessionRoutes';
import historyRoutes from './routes/historyRoutes';
import testLibraryRoutes from './routes/testLibraryRoutes';
import adminRoutes from './routes/adminRoutes';
import feedbackRoutes from './routes/feedbackRoutes';

export const createApp = (): Express => {
  const app = express();

  // 信任代理设置（当应用运行在反向代理如 nginx 后面时必需）
  // 这样 Express 才能正确读取 X-Forwarded-For 等头部信息
  app.set('trust proxy', true);

  // 中间件
  // CORS 配置：支持多个源，正确处理 www 和非 www 域名
  // 重要：使用函数返回实际的 origin 值，确保响应头只包含一个值
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, origin?: string | boolean) => void) => {
      // 允许的源列表
      const corsOriginEnv = process.env.CORS_ORIGIN || '*';
      const allowedOrigins = corsOriginEnv === '*' 
        ? ['*']
        : corsOriginEnv.split(',').map(o => o.trim()).filter(o => o);
      
      // 如果没有 origin（例如同源请求或 Postman），允许通过
      if (!origin) {
        return callback(null, true);
      }
      
      // 如果允许所有源
      if (allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      
      // 精确匹配
      if (allowedOrigins.includes(origin)) {
        return callback(null, origin); // 返回实际的 origin，确保只设置一个值
      }
      
      // 特殊处理：www 和非 www 域名的互操作性
      // 如果请求来自 webserialtool.com，也允许 www.webserialtool.com 的响应
      // 反之亦然（避免跨子域问题）
      const normalizedOrigin = origin.replace(/^https?:\/\/(www\.)?/, '');
      const matchedOrigin = allowedOrigins.find(allowed => {
        const normalizedAllowed = allowed.replace(/^https?:\/\/(www\.)?/, '');
        return normalizedOrigin === normalizedAllowed;
      });
      
      if (matchedOrigin) {
        // 返回请求的 origin，而不是匹配的 origin，避免值不匹配
        return callback(null, origin);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };
  
  app.use(cors(corsOptions));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // 国际化中间件（从请求头提取语言）
  app.use(i18nMiddleware);

  // 限流
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: '请求频率超限，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '10'),
    message: '登录请求过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // 健康检查
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API 路由
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/user', limiter, userRoutes);
  app.use('/api/profiles', limiter, profileRoutes);
  app.use('/api/projects', limiter, projectRoutes);
  app.use('/api/sessions', limiter, sessionRoutes);
  app.use('/api/history', limiter, historyRoutes);
  app.use('/api', limiter, testLibraryRoutes);
  app.use('/api/admin', limiter, adminRoutes);
  app.use('/api/feedback', limiter, feedbackRoutes);

  // 404 处理
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '请求的资源不存在',
      },
    });
  });

  // 错误处理
  app.use(errorHandler);

  return app;
};

