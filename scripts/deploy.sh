#!/bin/bash

##############################################
# WebSerialTool 一键部署脚本
# 适用于 Ubuntu 24.04
# 使用 root 用户部署
##############################################

set -e

echo "=========================================="
echo "  WebSerialTool.com 部署脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}此脚本需要 root 权限运行${NC}"
    echo "请使用 root 用户或 sudo 运行此脚本"
    echo "sudo bash scripts/deploy.sh"
    exit 1
fi

echo -e "${GREEN}✓ 使用 root 用户部署${NC}"
echo ""

# 函数：打印成功消息
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 函数：打印警告消息
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 函数：打印错误消息
error() {
    echo -e "${RED}✗ $1${NC}"
}

# 函数：检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "步骤 1: 检查系统环境..."
echo "-----------------------------------"

# 检查操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "操作系统: $NAME $VERSION"
else
    error "无法识别操作系统"
    exit 1
fi

# 检查必要的命令
echo ""
echo "步骤 2: 检查必要软件..."
echo "-----------------------------------"

MISSING_TOOLS=()

if ! command_exists docker; then
    warning "Docker 未安装"
    MISSING_TOOLS+=("docker")
else
    success "Docker 已安装: $(docker --version | cut -d' ' -f3)"
fi

if ! command_exists docker-compose; then
    warning "Docker Compose 未安装"
    MISSING_TOOLS+=("docker-compose")
else
    success "Docker Compose 已安装: $(docker-compose --version | cut -d' ' -f4)"
fi

if ! command_exists node; then
    warning "Node.js 未安装"
    MISSING_TOOLS+=("node")
else
    success "Node.js 已安装: $(node --version)"
fi

if ! command_exists nginx; then
    warning "Nginx 未安装"
    MISSING_TOOLS+=("nginx")
else
    success "Nginx 已安装"
fi

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo ""
    warning "缺少以下工具: ${MISSING_TOOLS[*]}"
    read -p "是否自动安装缺失的工具? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "正在安装缺失的工具..."
        
        # 更新包列表
        apt update
        
        # 安装 Docker
        if [[ " ${MISSING_TOOLS[@]} " =~ " docker " ]]; then
            echo "安装 Docker..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            rm get-docker.sh
            success "Docker 安装完成"
        fi
        
        # 安装 Docker Compose
        if [[ " ${MISSING_TOOLS[@]} " =~ " docker-compose " ]]; then
            echo "安装 Docker Compose..."
            curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
            success "Docker Compose 安装完成"
        fi
        
        # 安装 Node.js
        if [[ " ${MISSING_TOOLS[@]} " =~ " node " ]]; then
            echo "安装 Node.js 18..."
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt install -y nodejs
            success "Node.js 安装完成"
        fi
        
        # 安装 Nginx
        if [[ " ${MISSING_TOOLS[@]} " =~ " nginx " ]]; then
            echo "安装 Nginx..."
            apt install -y nginx
            systemctl enable nginx
            success "Nginx 安装完成"
        fi
        
        echo ""
        success "所有依赖已安装完成"
        sleep 2
    else
        error "取消部署"
        exit 1
    fi
fi

echo ""
echo "步骤 3: 准备项目目录..."
echo "-----------------------------------"

PROJECT_DIR="/root/projects/web-serial"

if [ -d "$PROJECT_DIR" ]; then
    warning "项目目录已存在: $PROJECT_DIR"
    read -p "是否继续使用现有目录? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "取消部署"
        exit 1
    fi
else
    echo "项目目录将创建在: $PROJECT_DIR"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "取消部署"
        exit 1
    fi
    mkdir -p "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"
success "工作目录: $(pwd)"

echo ""
echo "步骤 4: 配置环境变量..."
echo "-----------------------------------"

BACKEND_ENV="$PROJECT_DIR/backend/.env"
BACKEND_ENV_PROD="$PROJECT_DIR/backend/.env.production"

# 检查是否存在 .env.production 文件
if [ -f "$BACKEND_ENV_PROD" ]; then
    echo "发现 .env.production 文件，使用生产环境配置"
    
    # 复制 .env.production 为 .env
    cp "$BACKEND_ENV_PROD" "$BACKEND_ENV"
    success "已使用 .env.production 配置"
    
    # 检查是否需要生成 JWT_SECRET
    if grep -q "PLEASE_REPLACE" "$BACKEND_ENV"; then
        warning "检测到需要替换的配置项"
        echo "正在生成 JWT_SECRET..."
        
        # 生成随机 JWT Secret
        NEW_JWT_SECRET=$(openssl rand -base64 48)
        
        # 替换 JWT_SECRET
        sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=\"$NEW_JWT_SECRET\"|" "$BACKEND_ENV"
        rm "$BACKEND_ENV.bak" 2>/dev/null || true
        
        success "已自动生成 JWT_SECRET"
        
        echo ""
        warning "请检查并确认配置（特别是数据库密码和邮件配置）"
        read -p "是否现在编辑配置文件? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-vim} "$BACKEND_ENV"
        fi
    else
        success "配置文件已就绪"
    fi
elif [ ! -f "$BACKEND_ENV" ]; then
    warning "后端 .env 文件不存在，创建默认配置"
    
    # 生成随机 JWT Secret
    JWT_SECRET=$(openssl rand -base64 48)
    
    mkdir -p "$PROJECT_DIR/backend"
    
    cat > "$BACKEND_ENV" << EOF
# Node 环境
NODE_ENV=production
PORT=3001

# 数据库配置
DATABASE_URL="postgresql://webserial:$(openssl rand -base64 12)@postgres:5432/web_serial?schema=public"

# Redis 配置
REDIS_URL="redis://redis:6379"

# JWT 配置
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="7d"

# CORS 配置
CORS_ORIGIN="https://www.webserialtool.com"
FRONTEND_URL="https://www.webserialtool.com"

# 邮件配置（根据需要修改）
EMAIL_HOST="smtp.example.com"
EMAIL_PORT=587
EMAIL_USER="noreply@webserialtool.com"
EMAIL_PASSWORD=""
EMAIL_FROM="noreply@webserialtool.com"
EOF
    
    success "创建了默认 .env 文件"
    warning "请编辑 $BACKEND_ENV 并填入正确的配置"
    echo ""
    read -p "按 Enter 键继续编辑配置文件..."
    ${EDITOR:-vim} "$BACKEND_ENV"
else
    success "后端 .env 文件已存在"
fi

# 创建前端环境变量
FRONTEND_ENV="$PROJECT_DIR/frontend/.env.production"

if [ ! -f "$FRONTEND_ENV" ]; then
    mkdir -p "$PROJECT_DIR/frontend"
    
    cat > "$FRONTEND_ENV" << EOF
VITE_API_URL=https://www.webserialtool.com/api
VITE_WS_URL=wss://www.webserialtool.com/ws
EOF
    
    success "创建了前端 .env.production 文件"
else
    success "前端 .env.production 文件已存在"
fi

echo ""
echo "步骤 5: 部署后端服务..."
echo "-----------------------------------"

cd "$PROJECT_DIR/backend"

if [ -f "docker-compose.yml" ]; then
    echo "启动 Docker 服务..."
    docker-compose down || true
    docker-compose up -d
    
    echo "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        success "后端服务启动成功"
        
        # 测试健康检查
        echo "测试后端 API..."
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            success "后端 API 响应正常"
        else
            warning "后端 API 未响应，请检查日志: docker-compose logs backend"
        fi
    else
        error "后端服务启动失败"
        echo "查看日志: docker-compose logs"
        exit 1
    fi
else
    warning "docker-compose.yml 文件不存在，跳过后端部署"
fi

echo ""
echo "步骤 6: 构建前端..."
echo "-----------------------------------"

cd "$PROJECT_DIR/frontend"

if [ -f "package.json" ]; then
    echo "安装前端依赖..."
    npm install
    
    echo "构建前端..."
    npm run build
    
    if [ -d "dist" ]; then
        success "前端构建成功"
        
        # 部署前端文件
        echo "部署前端文件到 Nginx..."
        mkdir -p /var/www/webserialtool.com
        cp -r dist/* /var/www/webserialtool.com/
        chown -R www-data:www-data /var/www/webserialtool.com
        chmod -R 755 /var/www/webserialtool.com
        
        success "前端文件部署完成"
    else
        error "前端构建失败"
        exit 1
    fi
else
    warning "package.json 文件不存在，跳过前端构建"
fi

echo ""
echo "步骤 7: 配置 Nginx..."
echo "-----------------------------------"

NGINX_CONF="/etc/nginx/sites-available/webserialtool.com"

if [ ! -f "$NGINX_CONF" ]; then
    echo "创建 Nginx 配置文件..."
    
    tee "$NGINX_CONF" > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name webserialtool.com www.webserialtool.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        root /var/www/webserialtool.com;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws/ {
        proxy_pass http://localhost:3001/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        root /var/www/webserialtool.com;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    access_log /var/log/nginx/webserialtool.com.access.log;
    error_log /var/log/nginx/webserialtool.com.error.log;
}
EOF
    
    # 启用站点
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # 测试配置
    if nginx -t; then
        success "Nginx 配置测试通过"
        systemctl restart nginx
        success "Nginx 已重启"
    else
        error "Nginx 配置测试失败"
        exit 1
    fi
else
    success "Nginx 配置文件已存在"
fi

echo ""
echo "步骤 8: SSL 证书配置..."
echo "-----------------------------------"

if command_exists certbot; then
    success "Certbot 已安装"
    
    read -p "是否现在配置 SSL 证书? (需要域名已解析) (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "配置 SSL 证书..."
        certbot --nginx -d webserialtool.com -d www.webserialtool.com
        
        if [ $? -eq 0 ]; then
            success "SSL 证书配置成功"
        else
            warning "SSL 证书配置失败，请稍后手动配置"
        fi
    else
        warning "跳过 SSL 配置，稍后可手动执行:"
        echo "certbot --nginx -d webserialtool.com -d www.webserialtool.com"
    fi
else
    warning "Certbot 未安装"
    echo "安装命令: apt install -y certbot python3-certbot-nginx"
fi

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "服务状态检查:"
echo "-----------------------------------"

echo -n "Docker 容器: "
cd "$PROJECT_DIR/backend"
if docker-compose ps | grep -q "Up"; then
    success "运行中"
else
    error "未运行"
fi

echo -n "Nginx: "
if systemctl is-active --quiet nginx; then
    success "运行中"
else
    error "未运行"
fi

echo ""
echo "访问地址:"
echo "-----------------------------------"
echo "HTTP:  http://www.webserialtool.com"
echo "HTTPS: https://www.webserialtool.com"
echo ""

echo "常用命令:"
echo "-----------------------------------"
echo "查看后端日志:   cd $PROJECT_DIR/backend && docker-compose logs -f"
echo "重启后端服务:   cd $PROJECT_DIR/backend && docker-compose restart"
echo "重启 Nginx:     systemctl restart nginx"
echo "查看服务状态:   cd $PROJECT_DIR/backend && docker-compose ps"
echo ""

echo "下一步:"
echo "-----------------------------------"
echo "1. 确保域名 DNS 已正确解析到服务器 IP"
echo "2. 配置 SSL 证书 (如果尚未配置)"
echo "3. 测试网站功能"
echo "4. 配置数据库备份"
echo "5. 设置监控告警"
echo ""

echo "参考文档:"
echo "-----------------------------------"
echo "详细部署指南: docs/06-project-mgmt/09-生产环境部署指南.md"
echo "部署快速开始: docs/06-project-mgmt/10-部署快速开始.md"
echo "部署检查清单: docs/06-project-mgmt/12-部署检查清单.md"
echo ""

success "祝使用愉快！"

