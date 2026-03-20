#!/bin/bash

##############################################
# 数据库备份脚本
# 自动备份 PostgreSQL 数据库
##############################################

set -e

# 配置
BACKUP_DIR="/root/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
CONTAINER_NAME="web-serial-postgres"
DB_USER="webserial"
DB_NAME="web_serial"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=================================="
echo "  数据库备份脚本"
echo "=================================="
echo ""

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 检查容器是否运行
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}错误: 数据库容器未运行${NC}"
    exit 1
fi

echo "开始备份数据库..."
echo "容器: $CONTAINER_NAME"
echo "数据库: $DB_NAME"
echo "备份目录: $BACKUP_DIR"
echo ""

# 执行备份
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${DATE}.sql"

if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"; then
    echo -e "${GREEN}✓ 数据库备份成功${NC}"
    
    # 压缩备份文件
    echo "压缩备份文件..."
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    # 获取文件大小
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ 备份文件: $BACKUP_FILE (大小: $SIZE)${NC}"
    
    # 清理旧备份
    echo ""
    echo "清理 ${RETENTION_DAYS} 天前的备份..."
    DELETED=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    echo -e "${GREEN}✓ 删除了 $DELETED 个旧备份${NC}"
    
    # 显示当前备份列表
    echo ""
    echo "当前备份列表:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | tail -5 || echo "无备份文件"
    
    echo ""
    echo -e "${GREEN}备份完成！${NC}"
else
    echo -e "${RED}✗ 备份失败${NC}"
    exit 1
fi

