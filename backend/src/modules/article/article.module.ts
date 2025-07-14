import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../../entities/article.entity';
import { Category } from '../../entities/category.entity';
import { User } from '../../entities/user.entity';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { CqrsMessageModule } from '../../cqrs/cqrs-message.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Category, User]),
    CqrsMessageModule,
  ],
  controllers: [ArticleController],
  providers: [
    ArticleService,
  ],
  exports: [ArticleService],
})
export class ArticleModule {}