#!/bin/sh
set -e

echo "=========================================="
echo "  Backend Container Startup"
echo "=========================================="
echo ""

# DATABASE_URL 必须在环境变量文件中配置，不再支持自动构建
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  echo "Please configure DATABASE_URL in your .env or .env.production file"
  exit 1
fi

# 如果 DATABASE_URL 中包含 placeholder，说明是构建时的占位符，报错
if echo "$DATABASE_URL" | grep -q "placeholder"; then
  echo "❌ ERROR: DATABASE_URL contains placeholder!"
  echo "Please configure a valid DATABASE_URL in your .env or .env.production file"
  exit 1
fi

# 如果 DATABASE_URL 中包含 localhost 或 127.0.0.1，替换为 postgres（容器服务名）
export DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/localhost/postgres/g' | sed 's/127\.0\.0\.1/postgres/g')
echo "✓ DATABASE_URL found, using: ${DATABASE_URL%%@*}@***"

# 检查必需的环境变量
if [ -z "$JWT_SECRET" ]; then
  echo "❌ ERROR: JWT_SECRET is not set!"
  echo "Please set JWT_SECRET in your .env file"
  exit 1
fi

echo "✓ JWT_SECRET is set"
echo ""

# 运行数据库迁移
echo "Running database migrations..."
echo ""

# 检查是否存在迁移文件
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  # 存在迁移文件，执行 migrate deploy
  echo "✓ Migration files found, running migrate deploy..."
  if ! npx prisma migrate deploy; then
    echo "❌ ERROR: Database migration failed!"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check if PostgreSQL container is running: docker-compose ps postgres"
    echo "  2. Check PostgreSQL logs: docker-compose logs postgres"
    echo "  3. If using old database volume, reset database:"
    echo "     docker-compose down -v"
    echo "     docker-compose up -d"
    echo "  4. Verify database credentials match in docker-compose.yml and .env.production"
    exit 1
  fi
  echo "✓ Database migrations completed"
else
  # 不存在迁移文件，跳过 migrate deploy（使用 db push 模式）
  echo "⚠ No migration files found in prisma/migrations"
  echo "  Skipping migrate deploy (using db push mode)"
  echo "  Database schema should be managed via 'npm run reset:db' or 'prisma db push'"
  echo "✓ Migration check completed (db push mode)"
fi
echo ""

# 启动应用
echo "Starting application..."
exec npm start

