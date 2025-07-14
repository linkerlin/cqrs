import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { RedisService, QueueMessage } from '../redis/redis.service';

export interface CommandHandler {
  handle(payload: any): Promise<any>;
}

@Injectable()
export class JobProcessorService implements OnModuleInit, OnModuleDestroy {
  private commandHandlers = new Map<string, CommandHandler>();
  private isProcessing = false;
  private processingTimer: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL = 100; // 0.1秒 = 100毫秒

  constructor(
    private readonly redisService: RedisService,
    private readonly moduleRef: ModuleRef
  ) {}

  async onModuleInit() {
    // 启动Job处理器
    this.startProcessing();
  }

  async onModuleDestroy() {
    // 清理定时器
    this.stopProcessing();
  }

  /**
   * 注册命令处理器
   */
  registerCommandHandler(commandType: string, handler: CommandHandler) {
    this.commandHandlers.set(commandType, handler);
    console.log(`Registered command handler for: ${commandType}`);
  }

  /**
   * 启动处理循环 - 使用定时器轮询
   */
  private async startProcessing() {
    this.isProcessing = true;
    console.log('Job processor started with polling interval:', this.POLLING_INTERVAL, 'ms');

    // 使用定时器每0.1秒检查一次队列
    const pollQueue = async () => {
      if (!this.isProcessing) {
        console.log('Processing stopped, exiting poll loop');
        return;
      }

      try {
        // 从队列获取消息（非阻塞）
        const message = await this.redisService.getCommandFromQueueNonBlocking();
        
        if (message) {
          console.log(`[Job] Found message: ${message.type}, ID: ${message.id}, ResponseKey: ${message.responseKey}`);
          // 处理消息（不等待完成，继续轮询）
          this.processMessage(message).catch(error => {
            console.error('Error processing message in background:', error);
          });
        }
      } catch (error) {
        console.error('Error polling queue:', error);
      }

      // 设置下一次轮询
      if (this.isProcessing) {
        this.processingTimer = setTimeout(pollQueue, this.POLLING_INTERVAL);
      }
    };

    // 开始第一次轮询
    console.log('Starting first poll...');
    pollQueue();
  }

  /**
   * 处理消息
   */
  private async processMessage(message: QueueMessage) {
    const { id, type, payload, responseKey } = message;
    
    console.log(`[Job] Processing command: ${type}, ID: ${id}`);

    try {
      const handler = this.commandHandlers.get(type);
      
      if (!handler) {
        throw new Error(`No handler found for command type: ${type}`);
      }

      // 执行命令处理
      console.log(`[Job] Executing handler for ${type}...`);
      const result = await handler.handle(payload);
      console.log(`[Job] Handler execution completed for ${type}`);

      // 发送响应
      if (responseKey) {
        console.log(`[Job] Sending success response to ${responseKey}`);
        await this.redisService.sendResponse(responseKey, {
          success: true,
          data: result,
          timestamp: Date.now(),
        });
        console.log(`[Job] Response sent successfully for ${type}`);
      }

      console.log(`[Job] Command ${type} processed successfully`);
    } catch (error) {
      console.error(`[Job] Error processing command ${type}:`, error);

      // 发送错误响应
      if (responseKey) {
        console.log(`[Job] Sending error response to ${responseKey}`);
        await this.redisService.sendResponse(responseKey, {
          success: false,
          error: error.message,
          timestamp: Date.now(),
        });
        console.log(`[Job] Error response sent for ${type}`);
      }
    }
  }

  /**
   * 停止处理
   */
  stopProcessing() {
    this.isProcessing = false;
    
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
    
    console.log('Job processor stopped');
  }
} 