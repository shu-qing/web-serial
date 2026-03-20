import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createApp } from './app';
import { SignalingServer } from './websocket/signaling';
import prisma from './db/prisma';

// 加载环境变量（根据 NODE_ENV 自动选择文件）
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' : '.env';
const envFilePath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envFilePath)) {
  const envResult = dotenv.config({ 
    path: envFilePath,
    override: false // 不覆盖已存在的环境变量
  });
  if (!envResult.error) {
    console.log(`✅ Loaded environment variables from: ${envFile}`);
  }
} else if (nodeEnv !== 'production') {
  // 开发环境中，如果文件不存在，给出提示
  console.log(`ℹ️  ${envFile} not found, using environment variables from system`);
}

// 验证必需的环境变量
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach((varName) => console.error(`   - ${varName}`));
  process.exit(1);
}

// 显示当前环境
console.log(`🌍 NODE_ENV: ${nodeEnv}`);

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

// 创建 Express 应用
const app = createApp();

// 创建 HTTP 服务器
const server = http.createServer(app);

// 创建 WebSocket 服务器
const wss = new WebSocketServer({
  server,
  path: '/ws/signal',
});

// 创建信令服务器
const signalingServer = new SignalingServer(wss);

// 启动服务器
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('🚀 Web Serial Tool Backend Server');
  console.log('='.repeat(50));
  console.log(`📍 HTTP  Server: http://${HOST}:${PORT}`);
  console.log(`📍 WS    Server: ws://${HOST}:${PORT}/ws/signal`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
  console.log('');
});

// 优雅关闭
const gracefulShutdown = async () => {
  console.log('\n\n🛑 Gracefully shutting down...');

  // 关闭 WebSocket 服务器
  signalingServer.close();

  // 关闭 HTTP 服务器
  server.close(() => {
    console.log('✅ HTTP server closed');
  });

  // 关闭数据库连接
  await prisma.$disconnect();
  console.log('✅ Database connection closed');

  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 未捕获的异常处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

