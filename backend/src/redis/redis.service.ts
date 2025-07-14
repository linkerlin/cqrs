import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';

export interface QueueMessage {
  id: string;
  type: string;
  payload: any;
  responseKey?: string;
  timestamp: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly TIMEOUT = 30; // 30秒超时

  async onModuleInit() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    await this.client.connect();
    console.log('Connected to Redis');
  }

  async onModuleDestroy() {
    await this.client.disconnect();
  }

  /**
   * 发送命令到队列并等待响应
   */
  async sendCommandAndWaitResponse<T>(
    commandType: string,
    payload: any,
    timeout: number = this.TIMEOUT
  ): Promise<T> {
    const messageId = uuidv4();
    const responseKey = `response:${messageId}`;
    
    const message: QueueMessage = {
      id: messageId,
      type: commandType,
      payload,
      responseKey,
      timestamp: Date.now(),
    };

    console.log(`[Redis] Sending command ${commandType} with ID ${messageId}`);
    
    // 将命令推送到命令队列
    await this.client.lPush('command_queue', JSON.stringify(message));
    console.log(`[Redis] Command ${commandType} sent to queue`);

    // 等待响应 - 使用轮询而不是阻塞等待
    const startTime = Date.now();
    const pollInterval = 100; // 100ms轮询间隔
    
    while (Date.now() - startTime < timeout * 1000) {
      try {
        // 非阻塞方式检查响应
        const response = await this.client.rPop(responseKey);
        
        if (response) {
          console.log(`[Redis] Received response for ${commandType}, ID ${messageId}`);
          // 清理响应键
          await this.client.del(responseKey).catch(() => {});
          return JSON.parse(response);
        }
        
        // 等待一小段时间后再次轮询
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error(`[Redis] Error polling for response ${messageId}:`, error.message);
        // 继续轮询，不要因为单次错误而失败
      }
    }

    // 超时清理
    await this.client.del(responseKey).catch(() => {});
    console.error(`[Redis] Command ${commandType} (${messageId}) timed out after ${timeout}s`);
    throw new Error(`Command ${commandType} timed out`);
  }

  /**
   * 从命令队列获取消息（Job使用）
   */
  async getCommandFromQueue(): Promise<QueueMessage | null> {
    const result = await this.client.brPop('command_queue', 0);

    if (!result) {
      return null;
    }

    return JSON.parse(result.element);
  }

  /**
   * 从命令队列获取消息（非阻塞版本，用于轮询）
   */
  async getCommandFromQueueNonBlocking(): Promise<QueueMessage | null> {
    const result = await this.client.rPop('command_queue');

    if (!result) {
      return null;
    }

    return JSON.parse(result);
  }

  /**
   * 发送响应到响应队列
   */
  async sendResponse(responseKey: string, data: any): Promise<void> {
    console.log(`[Redis] Sending response to key: ${responseKey}`);
    try {
      await this.client.lPush(responseKey, JSON.stringify(data));
      console.log(`[Redis] Response sent successfully to ${responseKey}`);
      
      // 设置响应的过期时间
      await this.client.expire(responseKey, 60);
      console.log(`[Redis] Set expiration for ${responseKey}`);
    } catch (error) {
      console.error(`[Redis] Error sending response to ${responseKey}:`, error);
      throw error;
    }
  }

  /**
   * 缓存查询结果
   */
  async cacheQueryResult(key: string, data: any, ttl: number = 3600): Promise<void> {
    await this.client.setEx(key, ttl, JSON.stringify(data));
  }

  /**
   * 获取缓存的查询结果
   */
  async getCachedQueryResult<T>(key: string): Promise<T | null> {
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * 删除缓存
   */
  async deleteCachedResult(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * 删除匹配模式的缓存
   */
  async deleteCachedResultsByPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  /**
   * 设置简单缓存
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * 获取简单缓存
   */
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * 删除简单缓存
   */
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  /**
   * 获取Redis客户端实例（谨慎使用）
   */
  getClient(): RedisClientType {
    return this.client;
  }
} 