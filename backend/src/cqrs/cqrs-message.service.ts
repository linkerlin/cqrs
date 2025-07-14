import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CqrsMessageService implements OnModuleDestroy {
  private readonly queueEvents: QueueEvents;

  constructor(
    private readonly redisService: RedisService,
    @InjectQueue('command_queue') private commandQueue: Queue,
  ) {
    this.queueEvents = new QueueEvents('command_queue', {
      connection: this.commandQueue.opts.connection,
    });
  }

  async onModuleDestroy() {
    await this.queueEvents.close();
  }

  private async sendCommandAndWaitResponse<T>(
    commandType: string,
    payload: any,
  ): Promise<T> {
    const job = await this.commandQueue.add(commandType, payload, {
      removeOnComplete: true,
      removeOnFail: true,
    });

    try {
      const result = await job.waitUntilFinished(this.queueEvents, 30000);
      return result;
    } catch (error) {
      console.error(`[BullMQ] Job ${job.id} failed:`, error);
      throw error;
    }
  }

  async handleQuery<T>(
    queryType: string,
    params: any,
    cacheKey: string,
    cacheTTL: number = 3600,
  ): Promise<T> {
    const cached = await this.redisService.getCachedQueryResult<T>(cacheKey);
    if (cached) {
      console.log(`Query ${queryType} served from cache`);
      return cached;
    }

    console.log(`Query ${queryType} not in cache, sending to command queue`);
    const result = await this.sendCommandAndWaitResponse<T>(queryType, params);

    await this.redisService.cacheQueryResult(cacheKey, result, cacheTTL);

    return result;
  }

  async handleCommand<T>(commandType: string, payload: any): Promise<T> {
    console.log(`Command ${commandType} sent to queue`);
    return await this.sendCommandAndWaitResponse<T>(commandType, payload);
  }

  async clearCache(key: string): Promise<void> {
    await this.redisService.deleteCachedResult(key);
  }

  async clearCacheByPattern(pattern: string): Promise<void> {
    await this.redisService.deleteCachedResultsByPattern(pattern);
  }
}
 