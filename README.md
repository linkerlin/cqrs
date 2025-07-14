# CQRS CMS System

一个基于CQRS架构的全栈CMS系统，使用Redis作为消息队列和缓存层。

## 技术栈

### 前端
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Axios

### 后端
- NestJS
- TypeScript
- Redis
- CQRS架构

## 架构特点

### CQRS架构实现

本项目的核心创新点在于使用Redis List实现了双向消息通讯的CQRS架构：

1. **查询流程 (Query)**
   - Service层接收HTTP请求
   - 如果是Query请求，直接查询Redis缓存
   - 缓存存在则直接返回数据

2. **命令流程 (Command)**
   - 缓存不存在时，转入Command流程
   - Service层将JSON对象push到Redis List（模拟MQ）
   - Job层通过`brpop`阻塞读取Redis List
   - Job处理完成后，将结果push到指定的返回List
   - Service层在返回List上`brpop`等待结果

### Redis消息队列

- 使用Redis List模拟消息队列
- 通过`brpop`实现阻塞读取
- 支持超时机制
- 双向消息通讯

### 架构流程图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Frontend      │    │   Backend       │    │   Redis         │
│   (React)       │    │   (NestJS)      │    │   (Queue+Cache) │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │   HTTP Request         │                        │
         ├───────────────────────▶│                        │
         │                        │                        │
         │                        │   Query Cache?         │
         │                        ├───────────────────────▶│
         │                        │                        │
         │                        │   Cache Hit            │
         │                        │◀───────────────────────┤
         │                        │                        │
         │   Response (Cached)    │                        │
         │◀───────────────────────┤                        │
         │                        │                        │
         │                        │   Cache Miss           │
         │                        │                        │
         │                        │   Push Command        │
         │                        ├───────────────────────▶│
         │                        │                        │
         │                        │   Wait Response        │
         │                        │◀───────────────────────┤
         │                        │                        │
         │                        │                        │
         │                        │  ┌─────────────────┐   │
         │                        │  │                 │   │
         │                        │  │   Job Worker    │   │
         │                        │  │                 │   │
         │                        │  │   • brpop       │   │
         │                        │  │   • Process     │   │
         │                        │  │   • Response    │   │
         │                        │  │                 │   │
         │                        │  └─────────────────┘   │
         │                        │                        │
         │   Final Response       │                        │
         │◀───────────────────────┤                        │
         │                        │                        │
```

## 项目结构

```
cqrs/
├── frontend/          # React前端项目
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   └── package.json
├── backend/           # NestJS后端项目
│   ├── src/
│   │   ├── modules/
│   │   ├── cqrs/
│   │   ├── redis/
│   │   └── entities/
│   └── package.json
├── package.json       # 根配置文件
└── README.md
```

## 快速开始

### 前置条件
- Node.js >= 18
- Redis >= 6.0
- Docker (可选，用于容器化部署)

### 方法一：使用启动脚本（推荐）
```bash
# 给启动脚本添加执行权限
chmod +x start.sh

# 运行启动脚本
./start.sh
```

### 方法二：手动启动

#### 1. 安装依赖
```bash
npm run install:all
```

#### 2. 启动Redis
```bash
redis-server
```

#### 3. 启动开发服务器
```bash
npm run dev
```

这将同时启动前端和后端开发服务器：
- 前端：http://localhost:3000
- 后端：http://localhost:3001
- API文档：http://localhost:3001/api/docs

### 方法三：Docker部署
```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 构建项目
```bash
npm run build
```

## CMS功能

- 文章管理
- 用户管理
- 分类管理
- 媒体管理
- 评论系统

## 核心概念

### Command和Query分离
- **Command**: 改变系统状态的操作（创建、更新、删除）
- **Query**: 读取数据的操作（查询、列表、详情）

### Redis作为消息队列
- 使用Redis List实现消息队列
- 支持阻塞读取和超时机制
- 实现生产者-消费者模式

### 缓存策略
- 查询结果缓存到Redis
- 命令操作后清除相关缓存
- 支持缓存过期和更新

## 开发指南

### 添加新功能
1. 在`backend/src/modules/`下创建新模块
2. 实现相应的Command和Query处理器
3. 添加Redis队列处理逻辑
4. 创建前端组件和API调用

### API使用示例

#### 获取文章列表
```bash
curl -X GET "http://localhost:3001/api/articles?page=1&limit=10"
```

#### 创建文章
```bash
curl -X POST "http://localhost:3001/api/articles" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试文章",
    "slug": "test-article",
    "content": "这是一篇测试文章",
    "status": "draft"
  }'
```

#### 发布文章
```bash
curl -X POST "http://localhost:3001/api/articles/{articleId}/publish"
```

### 测试CQRS架构

#### 1. 测试查询缓存
```bash
# 第一次请求（会触发Command）
time curl -X GET "http://localhost:3001/api/articles/1"

# 第二次请求（从缓存返回）
time curl -X GET "http://localhost:3001/api/articles/1"
```

#### 2. 监控Redis队列
```bash
# 监控命令队列
redis-cli LLEN command_queue

# 监控响应队列
redis-cli KEYS "response:*"
```

### 测试
```bash
# 后端测试
cd backend && npm test

# 前端测试
cd frontend && npm test

# 端到端测试
npm run test:e2e
```

## 部署

### 生产环境部署

#### 1. 环境准备
- 确保服务器已安装Docker和Docker Compose
- 准备SSL证书（可选）
- 配置域名解析

#### 2. 配置环境变量
```bash
# 创建环境配置文件
cp backend/.env.example backend/.env

# 编辑配置文件
vim backend/.env
```

#### 3. Docker部署
```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
```

#### 4. 手动部署
```bash
# 1. 构建项目
npm run build

# 2. 部署Redis服务
redis-server --daemonize yes

# 3. 启动后端服务
cd backend && npm start

# 4. 部署前端静态文件到Nginx
cp -r frontend/dist/* /var/www/html/
```

### 性能优化

#### 1. Redis配置优化
```bash
# 在redis.conf中配置
maxmemory 256mb
maxmemory-policy allkeys-lru
```

#### 2. 数据库优化
```bash
# 定期清理过期缓存
redis-cli FLUSHDB

# 监控内存使用
redis-cli INFO memory
```

#### 3. 应用监控
```bash
# 使用PM2管理后端进程
npm install -g pm2
pm2 start backend/dist/main.js --name cqrs-cms-backend
pm2 monitor
```

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License
