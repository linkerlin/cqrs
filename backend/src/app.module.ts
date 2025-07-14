import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from './redis/redis.module';
import { ArticleModule } from './modules/article/article.module';
import { UserModule } from './modules/user/user.module';
import { CategoryModule } from './modules/category/category.module';
import { CqrsMessageModule } from './cqrs/cqrs-message.module';
import { HealthController } from './health.controller';
import { AppController } from './app.controller';

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
    CqrsModule,
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'cms.db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: false,
    }),
    RedisModule,
    CqrsMessageModule,
    ArticleModule,
    UserModule,
    CategoryModule,
  ],
  controllers: [AppController, HealthController],
  providers: [],
})
export class AppModule {} 