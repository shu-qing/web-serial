#!/bin/bash

##############################################
# 服务监控脚本
# 显示所有服务的运行状态
##############################################

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/root/projects/web-serial"

clear

echo "=================================="
echo "  WebSerialTool 服务监控"
echo "  $(date)"
echo "=================================="
echo ""

# 1. 系统资源
echo -e "${BLUE}系统资源:${NC}"
echo "-----------------------------------"

# CPU 使用率
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')
echo "CPU 使用率: $CPU_USAGE"

# 内存使用
MEM_INFO=$(free -h | awk 'NR==2{printf "已用: %s / 总计: %s (%.2f%%)", $3, $2, $3/$2*100}')
echo "内存: $MEM_INFO"

# 磁盘使用
DISK_INFO=$(df -h / | awk 'NR==2{printf "已用: %s / 总计: %s (%s)", $3, $2, $5}')
echo "磁盘: $DISK_INFO"

echo ""

# 2. Docker 容器状态
echo -e "${BLUE}Docker 容器:${NC}"
echo "-----------------------------------"

if command -v docker &> /dev/null && [ -d "$PROJECT_DIR/backend" ]; then
    cd "$PROJECT_DIR/backend"
    
    CONTAINERS=$(docker-compose ps --format json 2>/dev/null | jq -r '.Name + " " + .State' 2>/dev/null || docker-compose ps 2>/dev/null)
    
    if [ -n "$CONTAINERS" ]; then
        while IFS= read -r line; do
            NAME=$(echo "$line" | awk '{print $1}')
            STATUS=$(echo "$line" | awk '{print $2}')
            
            if [[ "$STATUS" == *"running"* ]] || [[ "$STATUS" == "Up"* ]]; then
                echo -e "  ${GREEN}✓${NC} $NAME: 运行中"
            else
                echo -e "  ${RED}✗${NC} $NAME: 已停止"
            fi
        done <<< "$CONTAINERS"
    else
        echo -e "  ${YELLOW}⚠${NC} 无容器运行"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} Docker 未安装或项目目录不存在"
fi

echo ""

# 3. Nginx 状态
echo -e "${BLUE}Nginx 服务:${NC}"
echo "-----------------------------------"

if systemctl is-active --quiet nginx; then
    echo -e "  ${GREEN}✓${NC} Nginx: 运行中"
    
    # 连接数
    CONNECTIONS=$(ss -tan | grep :80 | wc -l)
    echo "  当前连接数: $CONNECTIONS"
    
    # 前端目录检查
    if [ -d "/var/www/webserialtool.com" ]; then
        if [ -f "/var/www/webserialtool.com/index.html" ]; then
            FILE_COUNT=$(find /var/www/webserialtool.com -type f | wc -l)
            echo -e "  ${GREEN}✓${NC} 前端目录: 正常 ($FILE_COUNT 个文件)"
        else
            echo -e "  ${YELLOW}⚠${NC} 前端目录: 存在但缺少 index.html"
        fi
    else
        echo -e "  ${RED}✗${NC} 前端目录: 不存在 (/var/www/webserialtool.com)"
    fi
else
    echo -e "  ${RED}✗${NC} Nginx: 已停止"
fi

echo ""

# 4. 后端 API 健康检查
echo -e "${BLUE}后端 API:${NC}"
echo "-----------------------------------"

if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} API 健康检查: 正常"
    
    # 响应时间
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3001/health)
    echo "  响应时间: ${RESPONSE_TIME}s"
else
    echo -e "  ${RED}✗${NC} API 健康检查: 失败"
fi

echo ""

# 5. SSL 证书状态
echo -e "${BLUE}SSL 证书:${NC}"
echo "-----------------------------------"

if command -v certbot &> /dev/null; then
    CERT_INFO=$(sudo certbot certificates 2>/dev/null | grep -A 2 "webserialtool.com" | grep "Expiry Date")
    
    if [ -n "$CERT_INFO" ]; then
        EXPIRY_DATE=$(echo "$CERT_INFO" | sed 's/.*Expiry Date: //')
        DAYS_LEFT=$(( ($(date -d "$EXPIRY_DATE" +%s) - $(date +%s)) / 86400 ))
        
        if [ $DAYS_LEFT -gt 30 ]; then
            echo -e "  ${GREEN}✓${NC} 证书有效期: $DAYS_LEFT 天"
        elif [ $DAYS_LEFT -gt 7 ]; then
            echo -e "  ${YELLOW}⚠${NC} 证书有效期: $DAYS_LEFT 天 (即将过期)"
        else
            echo -e "  ${RED}✗${NC} 证书有效期: $DAYS_LEFT 天 (紧急续期)"
        fi
        
        echo "  到期时间: $EXPIRY_DATE"
    else
        echo -e "  ${YELLOW}⚠${NC} 未找到证书信息"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} Certbot 未安装"
fi

echo ""

# 6. 最近的日志
echo -e "${BLUE}最近的错误日志:${NC}"
echo "-----------------------------------"

if [ -d "$PROJECT_DIR/backend" ]; then
    cd "$PROJECT_DIR/backend"
    
    # Docker 日志
    ERRORS=$(docker-compose logs --tail=50 backend 2>/dev/null | grep -i "error" | tail -3)
    
    if [ -n "$ERRORS" ]; then
        echo "$ERRORS" | while IFS= read -r line; do
            echo -e "  ${RED}•${NC} $(echo "$line" | cut -c1-80)"
        done
    else
        echo -e "  ${GREEN}✓${NC} 无错误日志"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} 无法访问日志"
fi

# Nginx 错误日志（只显示最近的错误）
if [ -f /var/log/nginx/webserialtool.com.error.log ]; then
    # 只显示最近10条错误日志
    NGINX_ERRORS=$(sudo tail -10 /var/log/nginx/webserialtool.com.error.log 2>/dev/null | grep -v "^$")
    
    if [ -n "$NGINX_ERRORS" ]; then
        echo ""
        echo "Nginx 错误（最近10条）:"
        echo "$NGINX_ERRORS" | while IFS= read -r line; do
            # 显示完整错误信息，不截断
            echo -e "  ${RED}•${NC} $line"
        done
        
        # 检查前端目录
        if [ ! -d "/var/www/webserialtool.com" ]; then
            echo ""
            echo -e "  ${RED}✗${NC} 前端目录不存在: /var/www/webserialtool.com"
            echo -e "  ${YELLOW}建议: 运行部署脚本更新前端${NC}"
        elif [ ! -f "/var/www/webserialtool.com/index.html" ]; then
            echo ""
            echo -e "  ${YELLOW}⚠${NC} 前端目录存在但缺少 index.html"
            echo -e "  ${YELLOW}建议: 检查前端构建和部署${NC}"
        else
            # 检查常见缺失文件
            MISSING_FILES=""
            for file in "favicon.svg" "robots.txt"; do
                if [ ! -f "/var/www/webserialtool.com/$file" ]; then
                    MISSING_FILES="$MISSING_FILES $file"
                fi
            done
            if [ -n "$MISSING_FILES" ]; then
                echo ""
                echo -e "  ${YELLOW}⚠${NC} 缺少文件:$MISSING_FILES"
                echo -e "  ${YELLOW}提示: 这些文件缺失可能导致 404 错误，但不影响主要功能${NC}"
            fi
        fi
    fi
fi

echo ""

# 7. 数据库备份
echo -e "${BLUE}最近的备份:${NC}"
echo "-----------------------------------"

BACKUP_DIR="/root/backups/database"

if [ -d "$BACKUP_DIR" ]; then
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | head -1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        BACKUP_TIME=$(stat -c %y "$LATEST_BACKUP" | cut -d'.' -f1)
        BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
        echo -e "  ${GREEN}✓${NC} 最新备份: $BACKUP_TIME"
        echo "  大小: $BACKUP_SIZE"
        
        # 检查备份是否过旧（超过2天）
        BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 86400 ))
        if [ $BACKUP_AGE -gt 2 ]; then
            echo -e "  ${YELLOW}⚠${NC} 备份已过期 $BACKUP_AGE 天"
        fi
    else
        echo -e "  ${RED}✗${NC} 无备份文件"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} 备份目录不存在"
fi

echo ""
echo "=================================="
echo "快捷命令:"
echo "  查看后端日志: cd $PROJECT_DIR/backend && docker-compose logs -f"
echo "  重启后端: cd $PROJECT_DIR/backend && docker-compose restart"
echo "  重启 Nginx: systemctl restart nginx"
echo "  数据库备份: bash /root/backup-db.sh"
echo "=================================="
echo ""

