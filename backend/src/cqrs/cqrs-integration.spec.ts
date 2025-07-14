import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../redis/redis.service';
import { CqrsMessageService } from './cqrs-message.service';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Queue, QueueEvents, ConnectionOptions } from 'bullmq';

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  lPush: jest.fn(),
  rPop: jest.fn(),
  brPop: jest.fn(),
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  on: jest.fn(),
};

// Mock Redis module
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

// Mock QueueEvents
jest.mock('bullmq', () => ({
  ...jest.requireActual('bullmq'),
  QueueEvents: jest.fn().mockImplementation((queueName: string, opts?: { connection?: ConnectionOptions }) => ({
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    connection: opts?.connection || {}, // Provide a default mock connection
  })),
}));

describe('CQRS Integration Tests', () => {
  let redisService: RedisService;
  let cqrsMessageService: CqrsMessageService;
  let module: TestingModule;
  let mockCommandQueue: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    mockCommandQueue = {
      add: jest.fn(),
      opts: {
        connection: {
          host: 'localhost',
          port: 6379,
        } as ConnectionOptions,
      },
      name: 'command_queue',
      client: {} as any,
      bclient: {} as any,
    };
    
    module = await Test.createTestingModule({
      imports: [
        BullModule.forRoot({
          connection: {
            host: 'localhost',
            port: 6379,
          },
        }),
        BullModule.registerQueue({
          name: 'command_queue',
        }),
      ],
      providers: [
        RedisService,
        CqrsMessageService,
        {
          provide: getQueueToken('command_queue'),
          useValue: mockCommandQueue,
        },
      ],
    }).compile();

    redisService = module.get<RedisService>(RedisService);
    cqrsMessageService = module.get<CqrsMessageService>(CqrsMessageService);

    // Initialize services
    await redisService.onModuleInit();
  });

  afterEach(async () => {
    // Ensure module is defined before closing
    if (module) {
      await module.close();
    }
  });

  describe('RedisService Queue Operations', () => {
    it('should send message to command queue', async () => {
      // Arrange
      const commandType = 'DELETE_ARTICLE';
      const payload = { id: 'test-id' };
      mockRedisClient.lPush.mockResolvedValue(1);
      mockRedisClient.brPop.mockResolvedValue({
        key: 'response:test-id',
        element: JSON.stringify({ success: true, data: { success: true } })
      });

      // Act
      // Note: redisService.sendCommandAndWaitResponse is not used in the actual app anymore
      // This test might need to be updated to reflect the current architecture
      const result = redisService.sendCommandAndWaitResponse(commandType, payload, 5);

      // Assert - 验证命令被发送到队列
      await new Promise(resolve => setTimeout(resolve, 10)); // 让异步操作完成
      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        'command_queue',
        expect.stringContaining(commandType)
      );
    });

    it('should get message from queue (non-blocking)', async () => {
      // Arrange
      const queueMessage = {
        id: 'test-id',
        type: 'DELETE_ARTICLE',
        payload: { id: 'article-id' },
        timestamp: Date.now()
      };
      mockRedisClient.rPop.mockResolvedValue(JSON.stringify(queueMessage));

      // Act
      const result = await redisService.getCommandFromQueueNonBlocking();

      // Assert
      expect(mockRedisClient.rPop).toHaveBeenCalledWith('command_queue');
      expect(result).toEqual(queueMessage);
    });

    it('should return null when queue is empty', async () => {
      // Arrange
      mockRedisClient.rPop.mockResolvedValue(null);

      // Act
      const result = await redisService.getCommandFromQueueNonBlocking();

      // Assert
      expect(result).toBeNull();
    });

    it('should send response to response queue', async () => {
      // Arrange
      const responseKey = 'response:test-id';
      const responseData = { success: true, data: { id: 'test' } };
      mockRedisClient.lPush.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      // Act
      await redisService.sendResponse(responseKey, responseData);

      // Assert
      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        responseKey,
        JSON.stringify(responseData)
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(responseKey, 60);
    });
  });

  describe('CqrsMessageService Integration', () => {
    it('should handle command through CQRS', async () => {
      // Arrange
      const commandType = 'DELETE_ARTICLE';
      const payload = { id: 'test-article-id' };
      
      // Mock BullMQ Queue.add and Job.waitUntilFinished
      const mockJob = {
        id: 'job-id',
        waitUntilFinished: jest.fn().mockResolvedValue({ success: true, data: { success: true } }),
      };
      (mockCommandQueue.add as jest.Mock).mockResolvedValue(mockJob as any);

      // Act
      const result = await cqrsMessageService.handleCommand(commandType, payload);

      // Assert
      expect(mockCommandQueue.add).toHaveBeenCalledWith(commandType, payload, expect.any(Object));
      expect(mockJob.waitUntilFinished).toHaveBeenCalled();
      expect(result).toEqual({ success: true, data: { success: true } });
    });

    it('should handle query with cache miss', async () => {
      // Arrange
      const queryType = 'GET_ARTICLE_BY_ID';
      const params = { id: 'test-id' };
      const cacheKey = 'article:test-id';
      
      // Mock cache miss
      jest.spyOn(redisService, 'getCachedQueryResult').mockResolvedValue(null);
      
      // Mock BullMQ Queue.add and Job.waitUntilFinished
      const mockJob = {
        id: 'job-id',
        waitUntilFinished: jest.fn().mockResolvedValue({ 
          success: true, 
          data: { id: 'test-id', title: 'Test Article' } 
        }),
      };
      (mockCommandQueue.add as jest.Mock).mockResolvedValue(mockJob as any);
      
      // Mock cache set
      jest.spyOn(redisService, 'cacheQueryResult').mockResolvedValue(undefined);

      // Act
      const result = await cqrsMessageService.handleQuery(queryType, params, cacheKey);

      // Assert
      expect(redisService.getCachedQueryResult).toHaveBeenCalledWith(cacheKey);
      expect(mockCommandQueue.add).toHaveBeenCalledWith(queryType, params, expect.any(Object));
      expect(mockJob.waitUntilFinished).toHaveBeenCalled();
      expect(redisService.cacheQueryResult).toHaveBeenCalledWith(cacheKey, { success: true, data: { id: 'test-id', title: 'Test Article' } }, 3600);
      expect(result).toEqual({ success: true, data: { id: 'test-id', title: 'Test Article' } });
    });

    it('should handle query with cache hit', async () => {
      // Arrange
      const queryType = 'GET_ARTICLE_BY_ID';
      const params = { id: 'test-id' };
      const cacheKey = 'article:test-id';
      const cachedData = { id: 'test-id', title: 'Cached Article' };
      
      // Mock cache hit
      jest.spyOn(redisService, 'getCachedQueryResult').mockResolvedValue(cachedData);
      // Mock cacheQueryResult to be a spy
      jest.spyOn(redisService, 'cacheQueryResult').mockResolvedValue(undefined);
      
      // Act
      const result = await cqrsMessageService.handleQuery(queryType, params, cacheKey);

      // Assert
      expect(redisService.getCachedQueryResult).toHaveBeenCalledWith(cacheKey);
      expect(mockCommandQueue.add).not.toHaveBeenCalled(); // Should not send to queue
      expect(redisService.cacheQueryResult).not.toHaveBeenCalled(); // Should not cache again
      expect(result).toEqual(cachedData);
    });
  });

  describe('Error Handling', () => {
    it('should handle BullMQ job failures', async () => {
      // Arrange
      const commandType = 'FAIL_COMMAND';
      const payload = { message: 'This command will fail' };
      const mockError = new Error('Job processing failed');

      const mockJob = {
        id: 'job-id',
        waitUntilFinished: jest.fn().mockRejectedValue(mockError),
      };
      (mockCommandQueue.add as jest.Mock).mockResolvedValue(mockJob as any);

      // Act & Assert
      await expect(cqrsMessageService.handleCommand(commandType, payload)).rejects.toThrow(mockError);
      expect(mockCommandQueue.add).toHaveBeenCalledWith(commandType, payload, expect.any(Object));
      expect(mockJob.waitUntilFinished).toHaveBeenCalled();
    });
  });
});
