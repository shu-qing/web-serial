#!/bin/bash

##############################################
# 更新部署脚本
# 用于更新已部署的应用
# 支持代码同步后的快速更新
##############################################

set -e

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/root/projects/web-serial"

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}此脚本需要 root 权限运行${NC}"
    echo "请使用 root 用户或 sudo 运行此脚本"
    echo "sudo bash scripts/update-deployment.sh"
    exit 1
fi

echo "=================================="
echo "  更新部署"
echo "=================================="
echo ""

# 检查项目目录
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}错误: 项目目录不存在: $PROJECT_DIR${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

# 显示更新选项
echo "请选择更新内容:"
echo "1) 全部更新 (后端 + 前端)"
echo "2) 仅更新后端"
echo "3) 仅更新前端"
echo "4) 取消"
echo ""
read -p "请选择 (1-4): " -n 1 -r
echo ""

case $REPLY in
    1)
        UPDATE_BACKEND=true
        UPDATE_FRONTEND=true
        ;;
    2)
        UPDATE_BACKEND=true
        UPDATE_FRONTEND=false
        ;;
    3)
        UPDATE_BACKEND=false
        UPDATE_FRONTEND=true
        ;;
    4)
        echo "取消更新"
        exit 0
        ;;
    *)
        echo -e "${RED}无效选项${NC}"
        exit 1
        ;;
esac

# 更新后端
if [ "$UPDATE_BACKEND" = true ]; then
    echo ""
    echo "步骤 1: 更新后端..."
    echo "-----------------------------------"
    
    cd "$PROJECT_DIR/backend"
    
    # 加载环境变量（确保密码匹配）
    echo "加载环境变量..."
    if [ -f ".env" ]; then
        set -a
        source .env 2>/dev/null || true
        set +a
    fi
    if [ -f ".env.production" ]; then
        set -a
        source .env.production 2>/dev/null || true
        set +a
    fi
    
    # 设置默认值
    DB_USER="${DB_USER:-webserial}"
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
    
    # 备份数据库
    echo "备份数据库..."
    BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup-db.sh"
    if [ -f "$BACKUP_SCRIPT" ]; then
        bash "$BACKUP_SCRIPT"
        echo -e "${GREEN}✓ 数据库备份完成${NC}"
    else
        echo -e "${YELLOW}⚠ 备份脚本不存在 ($BACKUP_SCRIPT)，跳过备份${NC}"
        echo -e "${YELLOW}提示: 建议手动备份数据库${NC}"
    fi
    
    # 确保 PostgreSQL 和 Redis 容器已启动
    echo ""
    echo "确保数据库和缓存服务已启动..."
    docker-compose up -d postgres redis || {
        echo -e "${RED}✗ 数据库或缓存服务启动失败${NC}"
        exit 1
    }
    
    # 等待数据库就绪
    echo "等待数据库就绪..."
    MAX_DB_WAIT=30
    DB_WAIT_INTERVAL=2
    DB_ELAPSED=0
    DB_READY=false
    
    while [ $DB_ELAPSED -lt $MAX_DB_WAIT ]; do
        if docker-compose exec -T postgres pg_isready -U "$DB_USER" > /dev/null 2>&1; then
            DB_READY=true
            break
        fi
        echo "等待数据库启动... ($DB_ELAPSED/$MAX_DB_WAIT 秒)"
        sleep $DB_WAIT_INTERVAL
        DB_ELAPSED=$((DB_ELAPSED + DB_WAIT_INTERVAL))
    done
    
    if [ "$DB_READY" = false ]; then
        echo -e "${RED}✗ 数据库未就绪（等待 ${MAX_DB_WAIT} 秒后超时）${NC}"
        echo "数据库日志:"
        docker-compose logs --tail=50 postgres
        exit 1
    fi
    echo -e "${GREEN}✓ 数据库已就绪${NC}"
    
    # 验证数据库连接
    # 注意：PostgreSQL 容器在启动时使用 docker-compose.yml 中的 POSTGRES_PASSWORD
    # 该值来自环境变量 DB_PASSWORD（从 .env.production 读取）
    echo "验证数据库连接..."
    
    # 测试数据库连接（PostgreSQL 容器内部会使用 POSTGRES_PASSWORD 环境变量）
    # 如果连接失败，说明密码可能不匹配
    DB_CONNECTION_TEST=$(docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 数据库连接验证成功${NC}"
    else
        echo -e "${YELLOW}⚠ 数据库连接验证失败${NC}"
        echo ""
        echo "错误信息:"
        echo "$DB_CONNECTION_TEST" | head -5
        echo ""
        echo "诊断信息:"
        echo "  数据库用户: $DB_USER"
        echo "  数据库名称: $DB_NAME"
        echo "  环境变量 DB_PASSWORD 长度: ${#DB_PASSWORD}"
        echo ""
        echo "可能的原因:"
        echo "  .env.production 中的 DB_PASSWORD 与 PostgreSQL 容器初始化时的密码不一致"
        echo "  （重置数据库后，PostgreSQL 容器使用 docker-compose.yml 中的 POSTGRES_PASSWORD 初始化）"
        echo ""
        echo "解决方案（推荐）:"
        echo "  运行以下命令重新初始化数据库:"
        echo "    cd $PROJECT_DIR/backend"
        echo "    npm run reset:db"
        echo ""
        echo "  这会确保 PostgreSQL 容器使用 .env.production 中的 DB_PASSWORD 重新初始化"
        echo ""
        read -p "是否继续启动后端？（可能导致认证失败）(y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "操作已取消，请先修复数据库连接问题"
            exit 1
        fi
        echo -e "${YELLOW}⚠ 继续启动后端，但可能会失败${NC}"
    fi
    echo ""
    
    # 停止后端服务
    echo "停止后端服务..."
    docker-compose stop backend || true
    
    # 重新构建并启动
    echo "构建并启动后端..."
    docker-compose up -d --build backend
    
    # 等待服务启动
    echo "等待服务启动..."
    
    # 检查容器是否在运行
    echo "检查容器状态..."
    if ! docker-compose ps backend | grep -q "Up"; then
        echo -e "${RED}✗ 后端容器未启动${NC}"
        echo "查看日志:"
        docker-compose logs --tail=50 backend
        exit 1
    fi
    
    # 等待服务就绪，最多等待60秒
    MAX_WAIT=60
    WAIT_INTERVAL=5
    ELAPSED=0
    HEALTH_CHECK_PASSED=false
    
    echo "等待健康检查端点响应..."
    while [ $ELAPSED -lt $MAX_WAIT ]; do
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            HEALTH_CHECK_PASSED=true
            break
        fi
        echo "等待中... ($ELAPSED/$MAX_WAIT 秒)"
        sleep $WAIT_INTERVAL
        ELAPSED=$((ELAPSED + WAIT_INTERVAL))
    done
    
    if [ "$HEALTH_CHECK_PASSED" = true ]; then
        echo -e "${GREEN}✓ 后端服务启动成功${NC}"
    else
        echo -e "${RED}✗ 后端服务未响应（等待 ${MAX_WAIT} 秒后超时）${NC}"
        echo ""
        echo "容器状态:"
        docker-compose ps backend
        echo ""
        echo "最近日志:"
        docker-compose logs --tail=100 backend
        echo ""
        echo "诊断建议:"
        echo "1. 运行诊断脚本获取详细信息:"
        echo "   bash $PROJECT_DIR/scripts/diagnose-backend.sh"
        echo ""
        echo "2. 手动检查:"
        echo "   - 容器日志: cd $PROJECT_DIR/backend && docker-compose logs -f backend"
        echo "   - 环境变量: cd $PROJECT_DIR/backend && cat .env"
        echo "   - 数据库状态: cd $PROJECT_DIR/backend && docker-compose ps postgres"
        echo "   - 健康检查: curl -v http://localhost:3001/health"
        echo ""
        echo "3. 常见问题:"
        echo "   - 数据库连接失败: 检查 DATABASE_URL 或 DB_PASSWORD 配置"
        echo "     提示: 重置数据库后，确保 .env.production 中的 DB_PASSWORD 与 PostgreSQL 容器密码一致"
        echo "     检查: cd $PROJECT_DIR/backend && cat .env.production | grep DB_PASSWORD"
        echo "     修复: 如果密码不匹配，运行 'npm run reset:db' 重新初始化数据库"
        echo "   - 端口被占用: 检查是否有其他服务占用 3001 端口"
        echo "   - 构建失败: 检查 Dockerfile 和依赖"
        echo ""
        echo "4. 数据库认证问题排查:"
        echo "   - 检查 PostgreSQL 容器状态: cd $PROJECT_DIR/backend && docker-compose ps postgres"
        echo "   - 检查 PostgreSQL 日志: cd $PROJECT_DIR/backend && docker-compose logs postgres"
        echo "   - 测试数据库连接: cd $PROJECT_DIR/backend && docker-compose exec postgres psql -U $DB_USER -d $DB_NAME -c 'SELECT 1;'"
        echo "   - 如果密码不匹配，重新初始化: cd $PROJECT_DIR/backend && npm run reset:db"
        exit 1
    fi
fi

# 更新前端
if [ "$UPDATE_FRONTEND" = true ]; then
    echo ""
    echo "步骤 2: 更新前端..."
    echo "-----------------------------------"
    
    cd "$PROJECT_DIR/frontend"
    
    # 安装依赖
    echo "安装依赖..."
    npm install
    
    # 构建前端
    echo "构建前端..."
    npm run build
    
    if [ -d "dist" ]; then
        # 备份当前前端
        BACKUP_DIR="/var/www/webserialtool.com.backup.$(date +%s)"
        echo "备份当前前端到 $BACKUP_DIR"
        if [ -d "/var/www/webserialtool.com" ]; then
            cp -r /var/www/webserialtool.com "$BACKUP_DIR"
            echo -e "${GREEN}✓ 前端备份完成${NC}"
        else
            echo -e "${YELLOW}⚠ 前端目录不存在，跳过备份${NC}"
        fi
        
        # 部署新版本
        echo "部署新版本..."
        mkdir -p /var/www/webserialtool.com
        cp -r dist/* /var/www/webserialtool.com/
        chown -R www-data:www-data /var/www/webserialtool.com
        chmod -R 755 /var/www/webserialtool.com
        
        echo -e "${GREEN}✓ 前端更新成功${NC}"
        if [ -d "$BACKUP_DIR" ]; then
            echo "如需回滚: cp -r $BACKUP_DIR/* /var/www/webserialtool.com/"
        fi
    else
        echo -e "${RED}✗ 前端构建失败${NC}"
        exit 1
    fi
fi

# 更新并重启 Nginx
echo ""
echo "步骤 3: 更新并重启 Nginx..."
echo "-----------------------------------"

# 更新 Nginx 配置（如果配置文件存在）
NGINX_CONFIG_SOURCE="$PROJECT_DIR/scripts/ngix/webserialtool.com"
NGINX_CONFIG_TARGET="/etc/nginx/sites-available/webserialtool.com"

if [ -f "$NGINX_CONFIG_SOURCE" ]; then
    echo "更新 Nginx 配置..."
    cp "$NGINX_CONFIG_SOURCE" "$NGINX_CONFIG_TARGET"
    
    # 确保配置已启用
    if [ ! -L "/etc/nginx/sites-enabled/webserialtool.com" ]; then
        ln -s "$NGINX_CONFIG_TARGET" /etc/nginx/sites-enabled/webserialtool.com
    fi
    
    echo -e "${GREEN}✓ Nginx 配置已更新${NC}"
fi

# 测试并重启 Nginx
nginx -t
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo -e "${GREEN}✓ Nginx 配置已重新加载${NC}"
else
    echo -e "${RED}✗ Nginx 配置测试失败${NC}"
    echo "请检查配置: $NGINX_CONFIG_TARGET"
    exit 1
fi

# 完成
echo ""
echo "=================================="
echo -e "${GREEN}  更新完成！${NC}"
echo "=================================="
echo ""

echo "服务状态:"
echo "-----------------------------------"

if [ "$UPDATE_BACKEND" = true ]; then
    cd "$PROJECT_DIR/backend"
    echo "后端服务:"
    docker-compose ps backend
fi

echo ""
echo "访问地址: https://www.webserialtool.com"
echo ""

echo "查看日志:"
if [ "$UPDATE_BACKEND" = true ]; then
    echo "  后端: cd $PROJECT_DIR/backend && docker-compose logs -f backend"
fi
echo "  Nginx: tail -f /var/log/nginx/webserialtool.com.access.log"
echo ""

echo "快速回滚（如果需要）:"
if [ "$UPDATE_FRONTEND" = true ] && [ -d "$BACKUP_DIR" ]; then
    echo "  前端: cp -r $BACKUP_DIR/* /var/www/webserialtool.com/"
fi
if [ "$UPDATE_BACKEND" = true ]; then
    echo "  后端: cd $PROJECT_DIR/backend && docker-compose restart backend"
fi
echo ""

