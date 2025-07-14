import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, ArticleStatus } from '../../entities/article.entity';
import { Category } from '../../entities/category.entity';
import { User } from '../../entities/user.entity';
import { CommandHandler } from '../../cqrs/bullmq-processor.service';

@Injectable()
export class ArticleCreateHandler implements CommandHandler {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async handle(payload: any): Promise<any> {
    const { title, slug, excerpt, content, featuredImage, status, categoryIds, authorId, metadata } = payload;

    // 查找作者
    const author = await this.userRepository.findOne({ where: { id: authorId } });
    if (!author) {
      throw new Error('Author not found');
    }

    // 查找分类
    const categories = categoryIds ? await this.categoryRepository.findByIds(categoryIds) : [];

    // 创建文章
    const article = this.articleRepository.create({
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      status,
      metadata,
      author,
      categories,
      publishedAt: status === ArticleStatus.PUBLISHED ? new Date() : null
    });

    return await this.articleRepository.save(article);
  }
}

@Injectable()
export class ArticleUpdateHandler implements CommandHandler {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>
  ) {}

  async handle(payload: any): Promise<any> {
    const { id, categoryIds, ...updateData } = payload;

    const article = await this.articleRepository.findOne({ 
      where: { id },
      relations: ['categories']
    });

    if (!article) {
      throw new Error('Article not found');
    }

    // 更新基本信息
    Object.assign(article, updateData);

    // 更新分类
    if (categoryIds) {
      const categories = await this.categoryRepository.findByIds(categoryIds);
      article.categories = categories;
    }

    // 如果状态改为发布，设置发布时间
    if (updateData.status === ArticleStatus.PUBLISHED && !article.publishedAt) {
      article.publishedAt = new Date();
    }

    return await this.articleRepository.save(article);
  }
}

@Injectable()
export class ArticleDeleteHandler implements CommandHandler {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>
  ) {}

  async handle(payload: any): Promise<any> {
    const { id } = payload;

    // 查找文章（包含关联关系）
    const article = await this.articleRepository.findOne({ 
      where: { id },
      relations: ['categories'] // 加载分类关联
    });
    
    if (!article) {
      throw new Error('Article not found');
    }

    // TypeORM会自动处理多对多关系的清理
    await this.articleRepository.remove(article);
    return { success: true };
  }
}

@Injectable()
export class ArticlePublishHandler implements CommandHandler {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>
  ) {}

  async handle(payload: any): Promise<any> {
    const { id } = payload;

    const article = await this.articleRepository.findOne({ where: { id } });
    if (!article) {
      throw new Error('Article not found');
    }

    article.status = ArticleStatus.PUBLISHED;
    article.publishedAt = new Date();

    return await this.articleRepository.save(article);
  }
}

@Injectable()
export class ArticleViewIncrementHandler implements CommandHandler {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>
  ) {}

  async handle(payload: any): Promise<any> {
    const { id } = payload;

    await this.articleRepository.increment({ id }, 'viewCount', 1);
    return { success: true };
  }
}

@Injectable()
export class ArticleGetHandler implements CommandHandler {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>
  ) {}

  async handle(payload: any): Promise<any> {
    const { id } = payload;

    const article = await this.articleRepository.findOne({
      where: { id },
      relations: ['author', 'categories']
    });

    if (!article) {
      throw new Error('Article not found');
    }

    return article;
  }
}

@Injectable()
export class ArticleGetBySlugHandler implements CommandHandler {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>
  ) {}

  async handle(payload: any): Promise<any> {
    const { slug } = payload;

    const article = await this.articleRepository.findOne({
      where: { slug },
      relations: ['author', 'categories']
    });

    if (!article) {
      throw new Error('Article not found');
    }

    return article;
  }
}

@Injectable()
export class ArticleGetListHandler implements CommandHandler {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>
  ) {}

  async handle(payload: any): Promise<any> {
    const { page = 1, limit = 10, search, status, categoryId, authorId, sortBy = 'createdAt', sortOrder = 'DESC' } = payload;

    const queryBuilder = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.categories', 'categories');

    // 搜索
    if (search) {
      queryBuilder.andWhere('article.title LIKE :search OR article.content LIKE :search', {
        search: `%${search}%`
      });
    }

    // 状态过滤
    if (status) {
      queryBuilder.andWhere('article.status = :status', { status });
    }

    // 分类过滤
    if (categoryId) {
      queryBuilder.andWhere('categories.id = :categoryId', { categoryId });
    }

    // 作者过滤
    if (authorId) {
      queryBuilder.andWhere('author.id = :authorId', { authorId });
    }

    // 排序
    queryBuilder.orderBy(`article.${sortBy}`, sortOrder);

    // 分页
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [articles, total] = await queryBuilder.getManyAndCount();

    return {
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
} 