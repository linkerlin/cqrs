import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../../entities/article.entity';
import { Category } from '../../entities/category.entity';
import { User } from '../../entities/user.entity';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { CqrsMessageModule } from '../../cqrs/cqrs-message.module';
import { JobProcessorService } from '../../cqrs/job-processor.service';
import {
  ArticleCreateHandler,
  ArticleUpdateHandler,
  ArticleDeleteHandler,
  ArticlePublishHandler,
  ArticleViewIncrementHandler,
  ArticleGetHandler,
  ArticleGetBySlugHandler,
  ArticleGetListHandler
} from './article.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Category, User]),
    CqrsMessageModule
  ],
  controllers: [ArticleController],
  providers: [
    ArticleService,
    ArticleCreateHandler,
    ArticleUpdateHandler,
    ArticleDeleteHandler,
    ArticlePublishHandler,
    ArticleViewIncrementHandler,
    ArticleGetHandler,
    ArticleGetBySlugHandler,
    ArticleGetListHandler
  ],
  exports: [ArticleService]
})
export class ArticleModule implements OnModuleInit {
  constructor(
    private jobProcessorService: JobProcessorService,
    private articleCreateHandler: ArticleCreateHandler,
    private articleUpdateHandler: ArticleUpdateHandler,
    private articleDeleteHandler: ArticleDeleteHandler,
    private articlePublishHandler: ArticlePublishHandler,
    private articleViewIncrementHandler: ArticleViewIncrementHandler,
    private articleGetHandler: ArticleGetHandler,
    private articleGetBySlugHandler: ArticleGetBySlugHandler,
    private articleGetListHandler: ArticleGetListHandler
  ) {}

  onModuleInit() {
    // 注册命令处理器
    this.jobProcessorService.registerCommandHandler('CREATE_ARTICLE', this.articleCreateHandler);
    this.jobProcessorService.registerCommandHandler('UPDATE_ARTICLE', this.articleUpdateHandler);
    this.jobProcessorService.registerCommandHandler('DELETE_ARTICLE', this.articleDeleteHandler);
    this.jobProcessorService.registerCommandHandler('PUBLISH_ARTICLE', this.articlePublishHandler);
    this.jobProcessorService.registerCommandHandler('INCREMENT_ARTICLE_VIEW', this.articleViewIncrementHandler);
    this.jobProcessorService.registerCommandHandler('GET_ARTICLE_BY_ID', this.articleGetHandler);
    this.jobProcessorService.registerCommandHandler('GET_ARTICLE_BY_SLUG', this.articleGetBySlugHandler);
    this.jobProcessorService.registerCommandHandler('GET_ARTICLES', this.articleGetListHandler);
  }
} 