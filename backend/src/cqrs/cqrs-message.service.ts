import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CqrsMessageService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * 处理查询请求
   * 先检查缓存，如果存在则直接返回
   * 如果不存在，则发送命令到队列处理
   */
  async handleQuery<T>(
    queryType: string,
    params: any,
    cacheKey: string,
    cacheTTL: number = 3600
  ): Promise<T> {
    // 首先尝试从缓存获取
    const cached = await this.redisService.getCachedQueryResult<T>(cacheKey);
    if (cached) {
      console.log(`Query ${queryType} served from cache`);
      return cached;
    }

    // 缓存不存在，转换为命令处理
    console.log(`Query ${queryType} not in cache, sending to command queue`);
    const result = await this.redisService.sendCommandAndWaitResponse<T>(
      queryType,
      params
    );

    // 缓存结果
    await this.redisService.cacheQueryResult(cacheKey, result, cacheTTL);

    return result;
  }

  /**
   * 处理命令请求
   * 直接发送到队列处理，不走缓存
   */
  async handleCommand<T>(commandType: string, payload: any): Promise<T> {
    console.log(`Command ${commandType} sent to queue`);
    return await this.redisService.sendCommandAndWaitResponse<T>(
      commandType,
      payload
    );
  }

  /**
   * 清除相关缓存
   */
  async clearCache(key: string): Promise<void> {
    await this.redisService.deleteCachedResult(key);
  }

  /**
   * 按模式清除缓存
   */
  async clearCacheByPattern(pattern: string): Promise<void> {
    await this.redisService.deleteCachedResultsByPattern(pattern);
  }
} 