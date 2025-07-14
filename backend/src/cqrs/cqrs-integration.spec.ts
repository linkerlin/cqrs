import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../redis/redis.service';
import { CqrsMessageService } from './cqrs-message.service';

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

describe('CQRS Integration Tests', () => {
  let redisService: RedisService;
  let cqrsMessageService: CqrsMessageService;
  let module: TestingModule;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    module = await Test.createTestingModule({
      providers: [
        RedisService,
        CqrsMessageService,
      ],
    }).compile();

    redisService = module.get<RedisService>(RedisService);
    cqrsMessageService = module.get<CqrsMessageService>(CqrsMessageService);

    // Initialize services
    await redisService.onModuleInit();
  });

  afterEach(async () => {
    await module.close();
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
      
      mockRedisClient.lPush.mockResolvedValue(1);
      mockRedisClient.brPop.mockResolvedValue({
        key: 'response:test-id',
        element: JSON.stringify({ success: true, data: { success: true } })
      });

      // Act
      const resultPromise = cqrsMessageService.handleCommand(commandType, payload);

      // Let the async operations settle
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        'command_queue',
        expect.stringContaining(commandType)
      );
    });

    it('should handle query with cache miss', async () => {
      // Arrange
      const queryType = 'GET_ARTICLE_BY_ID';
      const params = { id: 'test-id' };
      const cacheKey = 'article:test-id';
      
      // Mock cache miss
      mockRedisClient.get.mockResolvedValue(null);
      
      // Mock command processing
      mockRedisClient.lPush.mockResolvedValue(1);
      mockRedisClient.brPop.mockResolvedValue({
        key: 'response:test-id',
        element: JSON.stringify({ 
          success: true, 
          data: { id: 'test-id', title: 'Test Article' } 
        })
      });
      
      // Mock cache set
      mockRedisClient.setEx.mockResolvedValue('OK');

      // Act
      const resultPromise = cqrsMessageService.handleQuery(queryType, params, cacheKey);

      // Let the async operations settle
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(mockRedisClient.get).toHaveBeenCalledWith(cacheKey);
      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        'command_queue',
        expect.stringContaining(queryType)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors', async () => {
      // Arrange
      mockRedisClient.rPop.mockRejectedValue(new Error('Redis connection failed'));

      // Act & Assert
      await expect(redisService.getCommandFromQueueNonBlocking()).rejects.toThrow('Redis connection failed');
    });

    it('should handle malformed queue messages', async () => {
      // Arrange
      mockRedisClient.rPop.mockResolvedValue('invalid-json');

      // Act & Assert
      await expect(redisService.getCommandFromQueueNonBlocking()).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent commands', async () => {
      // Arrange
      const commands = Array.from({ length: 10 }, (_, i) => ({
        type: 'DELETE_ARTICLE',
        payload: { id: `article-${i}` }
      }));

      mockRedisClient.lPush.mockResolvedValue(1);
      mockRedisClient.brPop.mockResolvedValue({
        key: 'response:test-id',
        element: JSON.stringify({ success: true, data: { success: true } })
      });

      // Act
      const promises = commands.map(cmd => 
        cqrsMessageService.handleCommand(cmd.type, cmd.payload)
      );

      // Let all operations settle
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      expect(mockRedisClient.lPush).toHaveBeenCalledTimes(10);
    });
  });
});