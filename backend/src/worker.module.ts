import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { BullMqProcessorService } from './cqrs/bullmq-processor.service';
import { Article, ArticleStatus } from './entities/article.entity';
import { Category } from './entities/category.entity';
import { User } from './entities/user.entity';
import {
  ArticleCreateHandler,
  ArticleUpdateHandler,
  ArticleDeleteHandler,
  ArticlePublishHandler,
  ArticleViewIncrementHandler,
  ArticleGetHandler,
  ArticleGetBySlugHandler,
  ArticleGetListHandler,
} from './modules/article/article.handler';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'command_queue',
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'cms.db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([Article, Category, User]),
  ],
  providers: [
    BullMqProcessorService,
    ArticleCreateHandler,
    ArticleUpdateHandler,
    ArticleDeleteHandler,
    ArticlePublishHandler,
    ArticleViewIncrementHandler,
    ArticleGetHandler,
    ArticleGetBySlugHandler,
    ArticleGetListHandler,
  ],
})
export class WorkerModule {}
