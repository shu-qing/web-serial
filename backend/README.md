# Web Serial Tool - Backend

Web Serial Tool 后端 API 服务。

> 📝 **文档说明**: 本文档已根据实际代码实现更新，反映当前版本的实际功能。

## 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **数据库**: PostgreSQL + Prisma ORM
- **WebSocket**: ws (信令服务器)
- **认证**: JWT
- **语言**: TypeScript
- **国际化**: 自定义 i18n 实现（支持中英文）

## 项目结构

```
backend/
├── prisma/                   # 数据库模型和迁移
├── src/
│   ├── controllers/          # 控制器层
│   ├── services/             # 业务逻辑层
│   ├── routes/               # 路由定义
│   ├── middleware/          # 中间件
│   ├── websocket/           # WebSocket 服务
│   ├── db/                  # 数据库配置
│   ├── utils/               # 工具函数
│   ├── types/               # TypeScript 类型定义
│   ├── locales/             # 国际化资源
│   ├── app.ts               # Express 应用
│   └── server.ts            # 服务器入口
├── package.json
├── tsconfig.json
├── .env                      # 实际使用的环境变量文件（由模板文件复制得到）
├── .env.development         # 开发环境配置模板
├── .env.production          # 生产环境配置模板
├── docker-compose.yml       # 实际使用的 Docker Compose 配置（由模板文件复制得到）
├── docker-compose.yml.development  # 开发环境 Docker Compose 配置模板
└── docker-compose.yml.production   # 生产环境 Docker Compose 配置模板
```

### 环境变量文件说明

项目使用模板文件 + 手动复制覆盖的方式管理环境变量：

1. **`.env.development`** - 开发环境配置模板
   - 包含开发环境所需的所有环境变量
   - 部署时手动复制到 `.env` 使用
   - 用于本地开发时的所有配置

2. **`.env.production`** - 生产环境配置模板
   - 包含生产环境所需的所有环境变量
   - 部署时手动复制到 `.env` 使用
   - 用于生产环境的所有配置（如生产数据库、密钥等）

3. **`.env`** - 实际使用的环境变量文件
   - 由对应的模板文件手动复制覆盖得到
   - 开发环境：复制 `.env.development` → `.env`
   - 生产环境：复制 `.env.production` → `.env`
   - 应用程序实际读取此文件

**注意**：
- 所有 `.env*` 文件包含敏感信息，不应提交到版本控制
- 在 Docker 容器中，环境变量可通过 `docker-compose.yml` 的 `env_file` 配置传递
- 切换环境时需要重新复制对应的模板文件覆盖 `.env`
- 开发和生产环境配置完全独立，互不影响

### Docker Compose 文件说明

项目同样使用模板文件 + 手动复制覆盖的方式管理 Docker Compose 配置：

1. **`docker-compose.yml.development`** - 开发环境 Docker Compose 配置模板
   - 包含开发环境所需的 Docker 服务配置
   - 部署时手动复制到 `docker-compose.yml` 使用

2. **`docker-compose.yml.production`** - 生产环境 Docker Compose 配置模板
   - 包含生产环境所需的 Docker 服务配置
   - 部署时手动复制到 `docker-compose.yml` 使用

3. **`docker-compose.yml`** - 实际使用的 Docker Compose 配置文件
   - 由对应的模板文件手动复制覆盖得到
   - 开发环境：复制 `docker-compose.yml.development` → `docker-compose.yml`
   - 生产环境：复制 `docker-compose.yml.production` → `docker-compose.yml`
   - Docker Compose 实际读取此文件

**注意**：
- 切换环境时需要同时重新复制对应的模板文件覆盖 `.env` 和 `docker-compose.yml`
- 开发和生产环境的配置完全独立，互不影响

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

根据运行环境，将对应的模板文件复制为 `.env`：

**开发环境**：将 `.env.development` 内容手动复制到 `.env`  
**生产环境**：将 `.env.production` 内容手动复制到 `.env`

### 3. 启动数据库服务（开发环境）

```bash
# 确保 Docker Desktop 正在运行

# 复制 Docker Compose 配置文件（开发环境）
# 将 docker-compose.yml.development 内容手动复制到 docker-compose.yml

# 如果是首次设置，或遇到数据库权限错误（P1010），需要先重置数据库卷：
# docker-compose down -v
# 这会删除所有数据卷，确保数据库使用正确的用户初始化

# 启动数据库和 Redis 服务
docker-compose up -d postgres redis

# 查看服务状态（可选）
docker-compose ps
```

### 4. 初始化数据库(开发环境)

```bash
# 生成 Prisma Client
npm run prisma:generate

# 初始化数据库
npx prisma db push

# 填充初始数据（包含创建默认管理员账号）
npm run prisma:seed
```

### 5. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3001` 启动。

### 健康检查

访问 `http://localhost:3001/health` 可以检查服务器状态。

## 数据库管理

### 查看数据库

```bash
npm run prisma:studio
```

### 创建迁移

```bash
npx prisma migrate dev --name migration_name
```

## API 文档

### 基础信息

- **Base URL**: `http://localhost:3001/api`
- **认证方式**: JWT Bearer Token
- **响应格式**: JSON
- **限流规则**: 
  - 认证接口：10 次/分钟
  - 其他接口：100 次/分钟
  - Wiki接口：200 次/分钟

### 主要接口模块

- **认证接口** (`/api/auth`): 用户注册、登录、登出、刷新令牌、邮箱验证
- **串口配置接口** (`/api/profiles`): 串口配置的 CRUD 操作
- **发送历史接口** (`/api/history`): 发送历史记录的查询和管理
- **测试库接口** (`/api/test-libraries`, `/api/test-suites`, `/api/test-cases`): 测试库、测试单、测试用例的完整 CRUD 操作
- **项目管理接口** (`/api/projects`): 项目的创建、查询、更新、删除
- **会话管理接口** (`/api/sessions`): 远程会话的创建、加入、离开、结束
- **用户接口** (`/api/user`): 用户信息、偏好设置的查询和更新
- **Wiki接口** (`/api/wiki`): Wiki 文章和分类的管理（公开接口和管理接口）
- **反馈接口** (`/api/feedback`): 用户反馈的提交和查询
- **管理员接口** (`/api/admin`): 用户管理、系统统计、日志查询、数据分析

详细的 API 文档请参考 `docs/03-api/01-RESTful-API规范.md`。

## WebSocket API

WebSocket 信令服务器用于实时通信，支持串口数据转发和会话管理。

- **连接地址**: `ws://localhost:3001/ws/signal`
- **连接参数**: `room`（房间ID）、`token`（JWT Token，可选）
- **消息类型**: ping/pong（心跳）、notification（通知）、data（数据转发）、error（错误）

详细的 WebSocket API 文档请参考 `docs/03-api/02-WebSocket-API规范.md`。


## 部署

### 开发环境部署

开发环境使用 Docker Compose 运行数据库和 Redis，后端服务在本地运行。

#### 1. 配置环境文件

将 `.env.development` 内容手动复制到 `.env`  
将 `docker-compose.yml.development` 内容手动复制到 `docker-compose.yml`

#### 2. 启动 Docker 服务

```bash
# 确保 Docker Desktop 正在运行

# 启动数据库和 Redis 服务
docker-compose up -d postgres redis

# 查看服务状态
docker-compose ps

# 查看数据库日志（可选）
docker-compose logs -f postgres
```

#### 3. 安装依赖并初始化数据库

```bash
# 安装 Node.js 依赖
npm install

# 生成 Prisma Client
npm run prisma:generate

# 初始化数据库
# 如果 prisma/migrations 目录为空（初次运行），使用 db push
# 如果已有迁移文件，使用: npx prisma migrate dev
npx prisma db push

# 填充初始数据（包含创建默认管理员账号）
npm run prisma:seed
```

#### 4. 启动开发服务器

```bash
# 启动开发服务器（支持热重载）
npm run dev
```

服务器将在 `http://localhost:3001` 启动。

#### 5. 验证部署

- **健康检查**: 访问 `http://localhost:3001/health`
- **API 文档**: 参考 `docs/03-api/01-RESTful-API规范.md`
- **数据库管理**: 运行 `npm run prisma:studio` 打开 Prisma Studio

#### 开发环境注意事项

- **数据库连接**: 本地开发时，`.env` 中的 `DATABASE_URL` 应使用 `localhost:5432` 而不是 `postgres:5432`
- **Docker 服务**: 只需启动 `postgres` 和 `redis` 服务，后端服务在本地运行
- **热重载**: 使用 `npm run dev` 启动开发服务器，代码修改会自动重启
- **数据库迁移**: 开发过程中使用 `npx prisma migrate dev` 创建和应用迁移
- **停止服务**: 使用 `docker-compose down` 停止 Docker 服务（数据会保留在 volume 中）
- **本地 PostgreSQL 冲突**: 如果 macOS 上安装了本地 PostgreSQL（通过 Homebrew），需要先停止本地服务：
  ```bash
  brew services stop postgresql@14  # 根据您的版本调整
  ```
  否则 `localhost:5432` 会连接到本地实例而不是 Docker 容器

### 生产环境部署

生产环境使用 Docker Compose 部署整个服务栈（包括 PostgreSQL、Redis 和后端服务）。

#### 1. 配置环境文件

将 `.env.production` 内容手动复制到 `.env`  
将 `docker-compose.yml.production` 内容手动复制到 `docker-compose.yml`

#### 2. 构建和启动服务

```bash
# 生成 Prisma Client
npm run prisma:generate

# 启动所有服务（包括数据库、Redis 和后端）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看所有服务日志
docker-compose logs -f

# 查看后端服务日志
docker-compose logs -f backend
```

#### 3. 初始化数据库（首次部署）

**为什么需要数据库迁移？**

首次部署时，数据库是空的，没有任何表结构。数据库迁移会：
- 根据 `prisma/migrations` 目录中的迁移文件创建所有数据库表
- 建立表之间的关系、索引和约束
- 记录迁移历史，便于后续版本升级和回滚

**如果没有迁移文件怎么办？**

如果 `prisma/migrations` 目录为空（首次部署且尚未创建迁移文件），需要先创建初始迁移：

```bash
# 1. 在开发环境创建初始迁移文件
# （在本地开发环境运行，不在 Docker 容器中）
npx prisma migrate dev --name init

# 2. 提交迁移文件到版本控制
# git add prisma/migrations
# git commit -m "Add initial database migration"

# 3. 在生产环境运行迁移
docker-compose exec backend npx prisma migrate deploy

# 4. 填充初始数据（包含创建默认管理员账号）
docker-compose exec backend npm run prisma:seed
```

**注意**：`prisma:seed` 会自动创建默认管理员账号：
- 邮箱：`webserialtool@gmail.com`
- 密码：`admin@webserial`
- 角色：`admin`

如果需要单独创建或重新创建管理员账号，可以再次运行：
```bash
docker-compose exec backend npm run prisma:seed
```

**注意**：
- 生产环境必须使用迁移文件（`migrate deploy`），可以版本控制和追踪数据库变更历史，支持回滚
- Docker 容器启动时会自动检测：如果有迁移文件则运行 `migrate deploy`，如果没有迁移文件则会跳过迁移步骤

#### 4. 验证部署

- **健康检查**: 访问 `http://your-domain:3001/health`
- **服务状态**: 运行 `docker-compose ps` 检查所有服务是否正常运行
- **日志检查**: 运行 `docker-compose logs backend` 查看后端日志

#### 生产环境注意事项

- **Docker 构建**: Docker 构建时会自动执行 `npm run build`（在 Dockerfile 中）
- **数据库迁移**: 容器启动后需要手动运行 `npx prisma migrate deploy` 应用迁移
- **数据库连接**: 容器内的 `DATABASE_URL` 应使用服务名 `postgres:5432` 而不是 `localhost`
- **环境变量**: 确保 `.env` 文件包含所有必要的生产环境配置
- **数据持久化**: 数据库数据存储在 Docker volume 中，删除容器不会丢失数据
- **服务重启**: 使用 `docker-compose restart` 重启服务，使用 `docker-compose down` 停止服务
- **备份**: 定期备份数据库 volume 或使用数据库备份工具

## 许可证

MIT

