import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import { Category } from './entities/category.entity';
import { Article, ArticleStatus } from './entities/article.entity';
import { Repository } from 'typeorm';

async function seed() {
  const app = await NestFactory.create(AppModule);
  
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const categoryRepository = app.get<Repository<Category>>(getRepositoryToken(Category));
  const articleRepository = app.get<Repository<Article>>(getRepositoryToken(Article));

  console.log('🌱 开始播种数据...');

  // 清理现有数据
  await articleRepository.clear();
  await categoryRepository.clear();
  await userRepository.clear();
  console.log('🗑️ 清理现有数据完成');

  // 创建用户
  const admin = userRepository.create({
    username: 'admin',
    email: 'admin@example.com',
    password: 'password123', // 实际项目中应该加密
    firstName: '管理员',
    lastName: '系统',
    role: UserRole.ADMIN,
    isActive: true
  });

  const author = userRepository.create({
    username: 'author1',
    email: 'author1@example.com',
    password: 'password123',
    firstName: '张',
    lastName: '三',
    role: UserRole.AUTHOR,
    isActive: true
  });

  await userRepository.save([admin, author]);
  console.log('✅ 用户数据创建完成');

  // 创建分类（nested-set需要单根结构）
  const rootCategory = categoryRepository.create({
    name: '根分类',
    slug: 'root',
    description: '根分类节点',
    color: '#6b7280',
    sort: 0,
    isActive: true
  });

  await categoryRepository.save(rootCategory);

  const techCategory = categoryRepository.create({
    name: '技术',
    slug: 'tech',
    description: '技术相关文章',
    color: '#3b82f6',
    sort: 1,
    isActive: true,
    parent: rootCategory
  });

  const lifestyleCategory = categoryRepository.create({
    name: '生活',
    slug: 'lifestyle',
    description: '生活方式相关文章',
    color: '#10b981',
    sort: 2,
    isActive: true,
    parent: rootCategory
  });

  await categoryRepository.save([techCategory, lifestyleCategory]);
  console.log('✅ 分类数据创建完成');

  // 创建文章
  const article1 = articleRepository.create({
    title: 'CQRS架构模式详解',
    slug: 'cqrs-architecture-explained',
    excerpt: '本文详细介绍了CQRS（命令查询责任分离）架构模式的原理和应用',
    content: `
# CQRS架构模式详解

CQRS（Command Query Responsibility Segregation）是一种架构模式，它将应用程序的读取和写入操作分离到不同的模型中。

## 核心概念

- **命令（Command）**：用于修改系统状态的操作
- **查询（Query）**：用于读取数据的操作
- **事件源（Event Sourcing）**：记录所有状态变化的事件

## 优势

1. **性能优化**：读写分离可以针对不同场景优化
2. **扩展性**：可以独立扩展读写部分
3. **复杂业务支持**：更好地处理复杂的业务逻辑

## 实现方式

本项目使用Redis作为消息队列，实现了创新的CQRS架构。
    `,
    featuredImage: 'https://example.com/cqrs-image.jpg',
    status: ArticleStatus.PUBLISHED,
    viewCount: 156,
    likeCount: 23,
    commentCount: 8,
    publishedAt: new Date(),
    metadata: {
      tags: ['CQRS', '架构', '软件设计'],
      readTime: 5
    },
    author: author,
    categories: [techCategory]
  });

  const article2 = articleRepository.create({
    title: 'Redis在现代Web应用中的应用',
    slug: 'redis-in-modern-web-apps',
    excerpt: '探讨Redis在缓存、会话存储和消息队列中的应用场景',
    content: `
# Redis在现代Web应用中的应用

Redis是一个高性能的内存数据结构存储，广泛应用于现代Web应用中。

## 主要用途

1. **缓存系统**：提高数据访问速度
2. **会话存储**：存储用户会话信息
3. **消息队列**：异步任务处理
4. **实时数据**：排行榜、计数器等

## 本项目的创新

我们使用Redis List实现了双向消息通讯的CQRS架构，这是一个创新的应用方式。
    `,
    featuredImage: 'https://example.com/redis-image.jpg',
    status: ArticleStatus.PUBLISHED,
    viewCount: 89,
    likeCount: 15,
    commentCount: 3,
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天
    metadata: {
      tags: ['Redis', '缓存', '性能优化'],
      readTime: 3
    },
    author: admin,
    categories: [techCategory]
  });

  const article3 = articleRepository.create({
    title: '高效工作的时间管理技巧',
    slug: 'time-management-tips',
    excerpt: '分享一些实用的时间管理方法，帮助提高工作效率',
    content: `
# 高效工作的时间管理技巧

时间管理是提高工作效率的关键技能。

## 核心原则

1. **优先级排序**：重要且紧急的事情优先
2. **时间块**：集中处理同类型任务
3. **避免干扰**：创造专注的工作环境

## 实用技巧

- 使用番茄工作法
- 制定每日计划
- 定期回顾和调整

掌握这些技巧，可以显著提高工作效率。
    `,
    status: ArticleStatus.DRAFT,
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    metadata: {
      tags: ['时间管理', '效率', '工作技巧'],
      readTime: 4
    },
    author: author,
    categories: [lifestyleCategory]
  });

  await articleRepository.save([article1, article2, article3]);
  console.log('✅ 文章数据创建完成');

  console.log('🎉 数据播种完成！');
  console.log(`
📊 数据统计：
- 用户：2个（1个管理员，1个作者）
- 分类：2个（技术、生活）
- 文章：3篇（2篇已发布，1篇草稿）

🚀 现在可以启动应用程序了！
  `);

  await app.close();
}

seed().catch(console.error); 