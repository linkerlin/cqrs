import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CqrsMessageService } from './cqrs-message.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    RedisModule,
    BullModule.registerQueue({
      name: 'command_queue',
    }),
  ],
  providers: [CqrsMessageService],
  exports: [CqrsMessageService],
})
export class CqrsMessageModule {}