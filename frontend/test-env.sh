#!/bin/bash

echo "=========================================="
echo "  环境变量配置验证"
echo "=========================================="
echo ""

echo "1. 检查环境变量文件..."
echo ""
echo "环境变量文件 (.env):"
if [ -f .env ]; then
  cat .env
else
  echo "  .env 文件不存在"
fi
echo ""
if [ -f .env.production ]; then
  echo "生产环境 (.env.production):"
  cat .env.production
  echo ""
fi

echo "2. 测试开发模式..."
echo "运行: npm run dev"
echo "然后在浏览器 Console 中输入: import.meta.env.VITE_API_URL"
echo "应该显示: http://localhost:3001/api"
echo ""

echo "3. 测试生产模式..."
echo "运行: npm run build"
echo "然后检查: grep -r 'webserialtool.com' dist/assets/*.js"
echo "应该看到: https://www.webserialtool.com/api"
echo ""

echo "=========================================="
echo "  验证完成"
echo "=========================================="
