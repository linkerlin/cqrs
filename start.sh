#!/bin/bash

# CQRS CMS System 启动脚本

echo "🚀 启动 CQRS CMS 系统..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18 或更高版本"
    exit 1
fi

# 检查Redis是否运行
if ! command -v redis-cli &> /dev/null; then
    echo "❌ Redis 未安装，请先安装 Redis 6.0 或更高版本"
    exit 1
fi

# 检查Redis连接
if ! redis-cli ping &> /dev/null; then
    echo "❌ Redis 未运行，请先启动 Redis 服务"
    echo "   可以使用命令: redis-server"
    exit 1
fi

echo "✅ 环境检查通过"

# 安装依赖
echo "📦 安装依赖..."
npm install

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend && npm install && cd ..

# 安装前端依赖
echo "📦 安装前端依赖..."
cd frontend && npm install && cd ..

echo "✅ 依赖安装完成"

# 启动开发服务器
echo "🚀 启动开发服务器..."
npm run dev 