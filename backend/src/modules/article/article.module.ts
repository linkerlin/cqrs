import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../../entities/article.entity';
import { Category } from '../../entities/category.entity';
import { User } from '../../entities/user.entity';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { CqrsMessageModule } from '../../cqrs/cqrs-message.module';
import { BullMqProcessorService } from '../../cqrs/bullmq-processor.service';
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
    private bullMqProcessorService: BullMqProcessorService,
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
    this.bullMqProcessorService.registerCommandHandler('CREATE_ARTICLE', this.articleCreateHandler);
    this.bullMqProcessorService.registerCommandHandler('UPDATE_ARTICLE', this.articleUpdateHandler);
    this.bullMqProcessorService.registerCommandHandler('DELETE_ARTICLE', this.articleDeleteHandler);
    this.bullMqProcessorService.registerCommandHandler('PUBLISH_ARTICLE', this.articlePublishHandler);
    this.bullMqProcessorService.registerCommandHandler('INCREMENT_ARTICLE_VIEW', this.articleViewIncrementHandler);
    this.bullMqProcessorService.registerCommandHandler('GET_ARTICLE_BY_ID', this.articleGetHandler);
    this.bullMqProcessorService.registerCommandHandler('GET_ARTICLE_BY_SLUG', this.articleGetBySlugHandler);
    this.bullMqProcessorService.registerCommandHandler('GET_ARTICLES', this.articleGetListHandler);
  }
} 