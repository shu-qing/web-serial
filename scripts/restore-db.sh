#!/bin/bash

##############################################
# 数据库恢复脚本
# 从备份文件恢复 PostgreSQL 数据库
##############################################

set -e

# 配置
BACKUP_DIR="/root/backups/database"
CONTAINER_NAME="web-serial-postgres"
DB_USER="webserial"
DB_NAME="web_serial"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=================================="
echo "  数据库恢复脚本"
echo "=================================="
echo ""

# 检查容器是否运行
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}错误: 数据库容器未运行${NC}"
    exit 1
fi

# 列出可用的备份文件
echo "可用的备份文件:"
echo ""

if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/backup_*.sql.gz 2>/dev/null)" ]; then
    echo -e "${RED}没有找到备份文件${NC}"
    exit 1
fi

# 显示备份列表
select BACKUP_FILE in "$BACKUP_DIR"/backup_*.sql.gz; do
    if [ -n "$BACKUP_FILE" ]; then
        break
    fi
done

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}未选择备份文件${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}警告: 此操作将覆盖当前数据库！${NC}"
echo "选择的备份文件: $BACKUP_FILE"
echo ""
read -p "确认恢复? (输入 yes 继续) " -r

if [ "$REPLY" != "yes" ]; then
    echo "取消恢复"
    exit 0
fi

echo ""
echo "开始恢复数据库..."

# 解压备份文件
TEMP_FILE="/tmp/restore_$(date +%s).sql"
gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"

# 停止后端服务（避免连接冲突）
echo "停止后端服务..."
cd "/root/projects/web-serial/backend"
docker-compose stop backend || true

# 恢复数据库
echo "恢复数据库..."
if docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" "$DB_NAME" < "$TEMP_FILE"; then
    echo -e "${GREEN}✓ 数据库恢复成功${NC}"
else
    echo -e "${RED}✗ 数据库恢复失败${NC}"
    rm -f "$TEMP_FILE"
    exit 1
fi

# 清理临时文件
rm -f "$TEMP_FILE"

# 重启后端服务
echo "重启后端服务..."
docker-compose start backend

echo ""
echo -e "${GREEN}恢复完成！${NC}"

