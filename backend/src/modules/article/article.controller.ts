import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../../entities/article.entity';
import { ArticleService } from './article.service';
import { CreateArticleDto, UpdateArticleDto, GetArticlesDto } from '../../common/dto/article.dto';

@ApiTags('articles')
@Controller('articles')
export class ArticleController {
  constructor(
    private readonly articleService: ArticleService,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>
  ) {}



  @Get('test')
  @ApiOperation({ summary: '测试直接数据库查询' })
  @ApiResponse({ status: 200, description: '成功获取测试数据' })
  async testDirectQuery() {
    try {
      const articles = await this.articleRepository.find({
        relations: ['author', 'categories'],
        take: 10,
        order: { createdAt: 'DESC' }
      });
      
      return {
        success: true,
        data: articles,
        message: '直接数据库查询成功'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '数据库查询失败'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('test-cqrs')
  @ApiOperation({ summary: '测试CQRS系统' })
  @ApiResponse({ status: 200, description: '成功测试CQRS系统' })
  async testCQRS() {
    try {
      const result = await this.articleService.getArticles({
        page: 1,
        limit: 10
      });
      
      return {
        success: true,
        data: result,
        message: 'CQRS系统测试成功'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'CQRS系统测试失败'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  @ApiOperation({ summary: '获取文章列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页条数' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'status', required: false, description: '文章状态' })
  @ApiQuery({ name: 'categoryId', required: false, description: '分类ID' })
  @ApiQuery({ name: 'authorId', required: false, description: '作者ID' })
  @ApiResponse({ status: 200, description: '成功获取文章列表' })
  async getArticles(@Query() query: GetArticlesDto) {
    try {
      const result = await this.articleService.getArticles(query);
      return {
        success: true,
        data: result,
        message: '获取文章列表成功'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '获取文章列表失败'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取文章' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiResponse({ status: 200, description: '成功获取文章' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async getArticleById(@Param('id') id: string) {
    try {
      const result = await this.articleService.getArticleById(id);
      return {
        success: true,
        data: result,
        message: '获取文章成功'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '获取文章失败'
        },
        error.message === 'Article not found' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: '根据Slug获取文章' })
  @ApiParam({ name: 'slug', description: '文章Slug' })
  @ApiResponse({ status: 200, description: '成功获取文章' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async getArticleBySlug(@Param('slug') slug: string) {
    try {
      const result = await this.articleService.getArticleBySlug(slug);
      // 增加浏览量
      const article = result as any;
      await this.articleService.incrementViewCount(article.id);
      
      return {
        success: true,
        data: result,
        message: '获取文章成功'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '获取文章失败'
        },
        error.message === 'Article not found' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post()
  @ApiOperation({ summary: '创建文章' })
  @ApiResponse({ status: 201, description: '文章创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async createArticle(@Body() createArticleDto: CreateArticleDto) {
    try {
      // 获取admin用户作为默认作者
      const adminUser = await this.articleRepository.manager.findOne('User', { 
        where: { username: 'admin' } 
      }) as any;
      
      if (!adminUser) {
        throw new Error('Admin user not found');
      }
      
      const result = await this.articleService.createArticle(createArticleDto, adminUser.id);
      return {
        success: true,
        data: result,
        message: '文章创建成功'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '文章创建失败'
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: '更新文章' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiResponse({ status: 200, description: '文章更新成功' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async updateArticle(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto) {
    try {
      const result = await this.articleService.updateArticle(id, updateArticleDto);
      return {
        success: true,
        data: result,
        message: '文章更新成功'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '文章更新失败'
        },
        error.message === 'Article not found' ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文章' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiResponse({ status: 200, description: '文章删除成功' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async deleteArticle(@Param('id') id: string) {
    try {
      const result = await this.articleService.deleteArticle(id);
      return {
        success: true,
        data: result,
        message: '文章删除成功'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '文章删除失败'
        },
        error.message === 'Article not found' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/publish')
  @ApiOperation({ summary: '发布文章' })
  @ApiParam({ name: 'id', description: '文章ID' })
  @ApiResponse({ status: 200, description: '文章发布成功' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async publishArticle(@Param('id') id: string) {
    try {
      const result = await this.articleService.publishArticle(id);
      return {
        success: true,
        data: result,
        message: '文章发布成功'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || '文章发布失败'
        },
        error.message === 'Article not found' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 