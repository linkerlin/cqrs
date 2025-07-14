import { Module } from '@nestjs/common';
import { CqrsMessageService } from './cqrs-message.service';
import { JobProcessorService } from './job-processor.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [CqrsMessageService, JobProcessorService],
  exports: [CqrsMessageService, JobProcessorService],
})
export class CqrsMessageModule {} 