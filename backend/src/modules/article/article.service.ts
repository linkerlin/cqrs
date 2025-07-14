import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../../entities/article.entity';
import { Category } from '../../entities/category.entity';
import { User } from '../../entities/user.entity';
import { CreateArticleDto, UpdateArticleDto, GetArticlesDto } from '../../common/dto/article.dto';
import { CqrsMessageService } from '../../cqrs/cqrs-message.service';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cqrsMessageService: CqrsMessageService
  ) {}

  /**
   * 获取文章列表 - Query (临时直接查询数据库)
   */
  async getArticles(params: GetArticlesDto) {
    const { page = 1, limit = 10, search, status, categoryId, authorId, sortBy = 'createdAt', sortOrder = 'DESC' } = params;

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

  /**
   * 根据ID获取文章 - Query
   */
  async getArticleById(id: string) {
    const cacheKey = `article:${id}`;
    
    return await this.cqrsMessageService.handleQuery(
      'GET_ARTICLE_BY_ID',
      { id },
      cacheKey,
      3600
    );
  }

  /**
   * 根据Slug获取文章 - Query
   */
  async getArticleBySlug(slug: string) {
    const cacheKey = `article:slug:${slug}`;
    
    return await this.cqrsMessageService.handleQuery(
      'GET_ARTICLE_BY_SLUG',
      { slug },
      cacheKey,
      3600
    );
  }

  /**
   * 创建文章 - Command (临时直接操作数据库)
   */
  async createArticle(createArticleDto: CreateArticleDto, authorId: string) {
    // 查找作者
    const author = await this.userRepository.findOne({ where: { id: authorId } });
    if (!author) {
      throw new Error('Author not found');
    }

    // 处理分类
    let categories = [];
    if (createArticleDto.categoryIds && createArticleDto.categoryIds.length > 0) {
      categories = await this.categoryRepository.findByIds(createArticleDto.categoryIds);
    }

    // 创建文章
    const article = this.articleRepository.create({
      ...createArticleDto,
      author,
      categories,
      slug: createArticleDto.slug || createArticleDto.title.toLowerCase().replace(/\s+/g, '-')
    });

    const savedArticle = await this.articleRepository.save(article);
    
    // 返回包含关联数据的文章
    return await this.articleRepository.findOne({
      where: { id: savedArticle.id },
      relations: ['author', 'categories']
    });
  }

  /**
   * 更新文章 - Command
   */
  async updateArticle(id: string, updateArticleDto: UpdateArticleDto) {
    const result = await this.cqrsMessageService.handleCommand(
      'UPDATE_ARTICLE',
      { id, ...updateArticleDto }
    );

    // 清除相关缓存
    await this.clearArticleCache();
    await this.cqrsMessageService.clearCache(`article:${id}`);

    return result;
  }

  /**
   * 删除文章 - Command
   */
  async deleteArticle(id: string) {
    const result = await this.cqrsMessageService.handleCommand(
      'DELETE_ARTICLE',
      { id }
    );

    // 清除相关缓存
    await this.clearArticleCache();
    await this.cqrsMessageService.clearCache(`article:${id}`);

    return result;
  }

  /**
   * 发布文章 - Command
   */
  async publishArticle(id: string) {
    const result = await this.cqrsMessageService.handleCommand(
      'PUBLISH_ARTICLE',
      { id }
    );

    // 清除相关缓存
    await this.clearArticleCache();
    await this.cqrsMessageService.clearCache(`article:${id}`);

    return result;
  }

  /**
   * 增加文章浏览量 - Command
   */
  async incrementViewCount(id: string) {
    return await this.cqrsMessageService.handleCommand(
      'INCREMENT_ARTICLE_VIEW',
      { id }
    );
  }

  /**
   * 清除文章相关缓存
   */
  private async clearArticleCache() {
    await this.cqrsMessageService.clearCacheByPattern('articles:*');
  }
} 