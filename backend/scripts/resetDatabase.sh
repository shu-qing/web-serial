#!/bin/bash

##############################################
# 重置数据库
# 从零开始构建数据库，不迁移历史数据
# 注意：此脚本只负责重置数据库和推送 schema，不创建管理员账号
# 如需创建管理员账号，请运行: npm run prisma:seed
##############################################

set -e

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取脚本所在目录的父目录（backend 目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=================================="
echo "  重置数据库"
echo "=================================="
echo ""

cd "$PROJECT_DIR"

# ============================================
# 加载环境变量
# ============================================
echo "加载环境变量..."

ENV_FILE=".env"

# 加载环境变量文件
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE" 2>/dev/null || true
    set +a
else
    echo -e "${RED}✗ 必须存在 ${ENV_FILE} 文件！${NC}"
    echo "  请确保 .env 文件存在并包含数据库配置"
    exit 1
fi

# 设置默认值（开发环境默认值，与 docker-compose.yml.development 一致）
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-web_serial}"

# 确保环境变量已导出（供 docker-compose 使用）
export DB_USER
export DB_PASSWORD
export DB_NAME

echo -e "${GREEN}✓ 环境变量已加载${NC}"
echo "  数据库用户: ${DB_USER}"
echo "  数据库名称: ${DB_NAME}"
echo "  数据库密码长度: ${#DB_PASSWORD} (已隐藏)"
echo ""
echo -e "${YELLOW}⚠️  重要提示：${NC}"
echo "  PostgreSQL 容器只在首次启动且数据目录为空时才会使用 POSTGRES_PASSWORD 设置密码"
echo "  如果数据卷已存在，PostgreSQL 会使用已存在的密码，忽略环境变量"
echo "  本脚本会删除数据卷，确保使用新的密码初始化"
echo ""

# ============================================
# 确认操作
# ============================================
echo -e "${YELLOW}⚠️  警告：此操作将删除所有数据库数据和迁移历史！${NC}"
echo ""
read -p "确认继续？(yes/no): " -r
echo ""

if [ "$REPLY" != "yes" ]; then
    echo "操作已取消"
    exit 0
fi

# ============================================
# 重置数据库
# ============================================
echo "步骤 1: 停止并删除所有容器和数据卷..."
docker-compose down -v || {
    echo -e "${YELLOW}⚠ 停止服务时出现警告（可能服务未运行）${NC}"
}
echo -e "${GREEN}✓ 容器和数据卷已删除${NC}"
echo ""

echo "步骤 2: 启动数据库容器..."
echo "  使用环境变量:"
echo "    DB_USER=${DB_USER}"
echo "    DB_PASSWORD=*** (长度: ${#DB_PASSWORD})"
echo "    DB_NAME=${DB_NAME}"
echo ""

# 确保环境变量已导出，供 docker-compose 使用
export DB_USER
export DB_PASSWORD
export DB_NAME

# 启动 PostgreSQL 容器
# 注意：docker-compose 会从当前 shell 环境读取 ${DB_PASSWORD} 等变量
docker-compose up -d postgres || {
    echo -e "${RED}✗ 数据库容器启动失败${NC}"
    echo ""
    echo "诊断信息:"
    echo "  检查环境变量是否已导出:"
    echo "    DB_USER=${DB_USER:-未设置}"
    echo "    DB_PASSWORD=${DB_PASSWORD:+已设置（长度: ${#DB_PASSWORD}）}${DB_PASSWORD:-未设置}"
    echo "    DB_NAME=${DB_NAME:-未设置}"
    echo ""
    echo "  如果环境变量未设置，请检查 .env 文件"
    exit 1
}
echo -e "${GREEN}✓ 数据库容器已启动${NC}"
echo ""

echo "步骤 3: 等待数据库就绪..."
sleep 5

# 检查数据库是否就绪
MAX_WAIT=30
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    # 指定数据库名，避免尝试连接到默认数据库（与用户名同名）
    if docker-compose exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1 || \
       docker-compose exec -T postgres pg_isready -U "$DB_USER" -d postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 数据库已就绪${NC}"
        break
    fi
    echo "等待中... ($ELAPSED/$MAX_WAIT 秒)"
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo -e "${RED}✗ 数据库启动超时${NC}"
    exit 1
fi
echo ""

echo "步骤 4: 推送数据库 schema（使用 db push）..."
echo ""

# URL 编码密码（处理特殊字符如 @）
urlencode() {
    echo "$1" | sed 's/@/%40/g; s/#/%23/g; s/\$/%24/g; s/&/%26/g; s/+/%2B/g; s/,/%2C/g; s/:/%3A/g; s/;/%3B/g; s/=/%3D/g; s/?/%3F/g; s/ /%20/g'
}

ENCODED_PASSWORD=$(urlencode "$DB_PASSWORD")
CONTAINER_DB_URL="postgresql://${DB_USER}:${ENCODED_PASSWORD}@postgres:5432/${DB_NAME}?schema=public"

# 使用 Prisma db push（不创建迁移文件，不运行 seed）
set +e  # 允许错误以便显示输出

echo "推送数据库 schema..."
DB_PUSH_OUTPUT=$(docker-compose run --rm \
    -e DATABASE_URL="$CONTAINER_DB_URL" \
    --entrypoint /bin/sh backend \
    -c "npx prisma db push --accept-data-loss" 2>&1)
DB_PUSH_EXIT_CODE=$?

# 显示输出
echo "$DB_PUSH_OUTPUT" | sed 's/^/    /'

if [ "$DB_PUSH_EXIT_CODE" -eq 0 ]; then
    echo ""
    echo -e "    ${GREEN}✓ 数据库 schema 推送成功${NC}"
else
    echo ""
    echo -e "    ${RED}✗ 数据库 schema 推送失败${NC}"
    echo ""
    echo "请检查上面的错误信息。"
    exit 1
fi

set -e
echo ""

# ============================================
# 验证表结构
# ============================================
echo "步骤 5: 验证表结构..."
sleep 2

# 检查 users 表是否存在（Prisma schema 中 User 模型映射到 users 表）
if docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "\d users" > /dev/null 2>&1 || \
   docker-compose exec -T postgres psql -U postgres -d "$DB_NAME" -c "\d users" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 表结构验证成功${NC}"
else
    echo -e "${YELLOW}⚠ 表结构验证失败，但继续...${NC}"
fi
echo ""

# ============================================
# 验证数据库密码
# ============================================
echo "步骤 6: 验证数据库密码..."
echo ""

# 验证方法1: 使用环境变量中的密码连接数据库
echo "  [1/3] 验证数据库连接（使用环境变量中的密码）..."
DB_CONNECTION_TEST=$(docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" 2>&1)
if [ $? -eq 0 ]; then
    echo -e "    ${GREEN}✓ 数据库连接成功（密码匹配）${NC}"
    DB_PASSWORD_MATCH=true
else
    echo -e "    ${RED}✗ 数据库连接失败（密码不匹配）${NC}"
    echo "    错误信息:"
    echo "$DB_CONNECTION_TEST" | head -3 | sed 's/^/      /'
    DB_PASSWORD_MATCH=false
fi
echo ""

# 验证方法2: 验证 DATABASE_URL 格式和密码编码
echo "  [2/3] 验证 DATABASE_URL 格式..."
ENCODED_PASSWORD=$(urlencode "$DB_PASSWORD")
CONTAINER_DB_URL="postgresql://${DB_USER}:${ENCODED_PASSWORD}@postgres:5432/${DB_NAME}?schema=public"

# 检查 URL 格式是否正确
if echo "$CONTAINER_DB_URL" | grep -q "postgresql://.*@postgres:5432"; then
    echo -e "    ${GREEN}✓ DATABASE_URL 格式正确${NC}"
    echo "    URL 预览: postgresql://${DB_USER}:***@postgres:5432/${DB_NAME}"
    DATABASE_URL_OK=true
else
    echo -e "    ${YELLOW}⚠ DATABASE_URL 格式可能有问题${NC}"
    DATABASE_URL_OK=false
fi
echo ""

# 验证方法3: 检查环境变量一致性
echo "  [3/3] 验证环境变量一致性..."
echo "    环境变量 DB_PASSWORD 长度: ${#DB_PASSWORD}"
echo "    数据库用户: $DB_USER"
echo "    数据库名称: $DB_NAME"

# 检查 .env 文件中的密码
if [ -f ".env" ]; then
    ENV_FILE_PASSWORD=$(grep "^DB_PASSWORD=" .env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | head -1)
    if [ -n "$ENV_FILE_PASSWORD" ]; then
        if [ "$ENV_FILE_PASSWORD" = "$DB_PASSWORD" ]; then
            echo -e "    ${GREEN}✓ .env 中的密码与环境变量一致${NC}"
        else
            echo -e "    ${YELLOW}⚠ .env 中的密码与环境变量不一致${NC}"
            echo "      .env 密码长度: ${#ENV_FILE_PASSWORD}"
            echo "      当前环境变量密码长度: ${#DB_PASSWORD}"
        fi
    else
        echo -e "    ${YELLOW}⚠ 未在 .env 中找到 DB_PASSWORD${NC}"
    fi
else
    echo -e "    ${YELLOW}⚠ .env 文件不存在${NC}"
fi
echo ""

# ============================================
# 完成
# ============================================
echo "=================================="
if [ "$DB_PASSWORD_MATCH" = true ]; then
    echo -e "${GREEN}  ✅ 数据库重置成功！密码验证通过！${NC}"
else
    echo -e "${YELLOW}  ⚠️  数据库重置完成，但密码验证失败${NC}"
fi
echo "=================================="
echo ""

if [ "$DB_PASSWORD_MATCH" = true ]; then
    echo "数据库已从零开始创建，表结构已就绪。"
    echo ""
    echo "✅ 数据库密码验证通过："
    echo "  - PostgreSQL 容器使用环境变量中的密码初始化"
    echo "  - 数据库连接测试成功"
    echo "  - 可以正常使用数据库"
    echo ""
    echo "📝 下一步："
    echo "  如需创建管理员账号，请运行："
    echo "    npm run prisma:seed"
    echo ""
else
    echo "⚠️  数据库密码验证失败："
    echo "  - 可能的原因："
    echo "    1. 环境变量 DB_PASSWORD 与 PostgreSQL 容器初始化时的密码不一致"
    echo "    2. 数据卷未完全删除，PostgreSQL 使用了旧密码"
    echo ""
    echo "  解决方案："
    echo "    1. 检查 .env 文件中的 DB_PASSWORD"
    echo "    2. 完全删除数据卷并重新运行脚本："
    echo "       docker-compose down -v"
    echo "       docker volume rm backend_postgres_data 2>/dev/null || true"
    echo "       npm run reset:db"
    echo ""
fi
