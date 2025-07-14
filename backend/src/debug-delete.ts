import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisService } from './redis/redis.service';
import { ArticleDeleteHandler } from './modules/article/article.handler';

import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function debugDeleteArticle() {
  console.log('🔧 开始调试删除文章功能...\n');

  const app = await NestFactory.create(AppModule);
  await app.init();

  try {
    // 获取服务实例
    const redisService = app.get(RedisService);
    // const jobProcessor = app.get(JobProcessorService);
    const articleRepository = app.get<Repository<Article>>(getRepositoryToken(Article));

    console.log('✅ 服务实例获取成功\n');

    // 1. 测试数据库查询
    console.log('📊 步骤1: 测试数据库查询...');
    let testArticleId = '129470a9-fa80-4dd4-a59b-5cff5ddb8726'; // 使用之前创建的文章ID
    
    try {
      let article = await articleRepository.findOne({
        where: { id: testArticleId },
        relations: ['categories']
      });
      
      if (article) {
        console.log('✅ 找到文章:', article.title);
        console.log('   分类数量:', article.categories?.length || 0);
      } else {
        console.log('❌ 文章不存在，创建新的测试文章...');
        
        // 创建测试文章，使用时间戳确保唯一性
        const timestamp = Date.now();
        const testArticle = articleRepository.create({
          title: `调试测试文章-${timestamp}`,
          slug: `debug-test-article-${timestamp}`,
          content: '用于调试的测试文章',
          status: 'draft' as any,
          categories: []
        });
        
        const savedArticle = await articleRepository.save(testArticle);
        console.log('✅ 测试文章创建成功:', savedArticle.id);
        console.log('   使用新创建的文章ID进行后续测试...');
        // 更新测试ID为新创建的文章ID
        testArticleId = savedArticle.id;
        article = savedArticle;
      }
    } catch (dbError) {
      console.error('❌ 数据库查询失败:', dbError.message);
      return;
    }

    // 2. 测试删除处理器
    console.log('\n🔨 步骤2: 直接测试删除处理器...');
    try {
      const deleteHandler = new ArticleDeleteHandler(articleRepository);
      const deleteResult = await deleteHandler.handle({ id: testArticleId });
      console.log('✅ 删除处理器执行成功:', deleteResult);
    } catch (handlerError) {
      console.error('❌ 删除处理器失败:', handlerError.message);
    }

    // 3. 测试Redis队列操作
    console.log('\n📤 步骤3: 测试Redis队列操作...');
    try {
      // 发送测试消息到队列
      const testMessage = {
        id: 'debug-test-id',
        type: 'DELETE_ARTICLE',
        payload: { id: 'debug-article-id' },
        responseKey: 'response:debug-test-id',
        timestamp: Date.now()
      };

      console.log('📤 发送测试消息到队列...');
      await redisService.getClient().lPush('command_queue', JSON.stringify(testMessage));
      console.log('✅ 消息发送成功');

      // 立即尝试读取
      console.log('📥 尝试从队列读取消息...');
      const retrievedMessage = await redisService.getCommandFromQueueNonBlocking();
      
      if (retrievedMessage) {
        console.log('✅ 成功读取消息:', retrievedMessage.type);
        console.log('   消息ID:', retrievedMessage.id);
      } else {
        console.log('❌ 队列为空');
      }

    } catch (redisError) {
      console.error('❌ Redis操作失败:', redisError.message);
    }

    // 4. 测试队列长度和状态
    console.log('\n📊 步骤4: 检查Redis队列状态...');
    try {
      const queueLength = await redisService.getClient().lLen('command_queue');
      console.log('📊 当前队列长度:', queueLength);

      // 检查Redis连接状态
      const pingResult = await redisService.getClient().ping();
      console.log('🏓 Redis连接状态:', pingResult);

    } catch (statusError) {
      console.error('❌ 检查Redis状态失败:', statusError.message);
    }

    // 5. 测试完整的CQRS流程
    console.log('\n🔄 步骤5: 测试完整CQRS流程...');
    try {
      console.log('📤 发送DELETE命令，使用文章ID:', testArticleId);
      
      // 使用较短的超时时间进行测试
      const result = await redisService.sendCommandAndWaitResponse(
        'DELETE_ARTICLE',
        { id: testArticleId }, // 使用实际的测试文章ID
        5 // 5秒超时
      );
      
      console.log('✅ CQRS流程成功:', result);
      
    } catch (cqrsError) {
      console.error('❌ CQRS流程失败:', cqrsError.message);
      
      // 检查是否是超时错误
      if (cqrsError.message.includes('timed out')) {
        console.log('⏰ 超时详情分析:');
        
        // 检查队列中是否有未处理的消息
        const queueLength = await redisService.getClient().lLen('command_queue');
        console.log('   队列长度:', queueLength);
        
        if (queueLength > 0) {
          console.log('⚠️  队列中有未处理消息，Job处理器可能未正常工作');
        } else {
          console.log('⚠️  队列为空，消息已被处理但响应未返回');
        }
      }
    }

    // 6. 检查Job处理器状态
    /* console.log('\n🤖 步骤6: 检查Job处理器状态...');
    try {
      // 使用已经注册的处理器进行测试
      console.log('📋 使用已注册的GET_ARTICLE_BY_ID处理器进行测试...');
      
      // 发送测试命令，使用已存在的文章ID
      const debugResult = await redisService.sendCommandAndWaitResponse(
        'GET_ARTICLE_BY_ID',
        { id: testArticleId },
        3
      );
      
      console.log('✅ Job处理器测试成功:', debugResult);
      
    } catch (debugError) {
      console.error('❌ Job处理器测试失败:', debugError.message);
    } */

  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error.message);
  } finally {
    await app.close();
    console.log('\n🏁 调试完成');
  }
}

// 运行调试
if (require.main === module) {
  debugDeleteArticle().catch(console.error);
}

export { debugDeleteArticle }; 