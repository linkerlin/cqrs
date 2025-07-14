import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import axios from 'axios';

async function testDeleteAPI() {
  console.log('🧪 开始测试DELETE API的CQRS流程...\n');

  // 启动应用
  const app = await NestFactory.create(AppModule);
  
  // 启用CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // API前缀 - 和主应用保持一致
  app.setGlobalPrefix('api');
  
  await app.listen(3002); // 使用不同的端口避免冲突
  console.log('✅ 测试服务器启动在端口 3002\n');

  try {
    // 等待服务完全启动
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 1. 创建测试文章
    console.log('📝 步骤1: 创建测试文章...');
    const createResponse = await axios.post('http://localhost:3002/api/articles', {
      title: `API测试文章-${Date.now()}`,
      slug: `api-test-article-${Date.now()}`,
      content: '用于API测试的文章',
      status: 'draft'
    });

    if (createResponse.data.success) {
      const articleId = createResponse.data.data.id;
      console.log('✅ 文章创建成功，ID:', articleId);

      // 2. 验证文章存在
      console.log('\n🔍 步骤2: 验证文章存在...');
      const getResponse = await axios.get(`http://localhost:3002/api/articles/${articleId}`);
      
      if (getResponse.data.success) {
        console.log('✅ 文章验证成功:', getResponse.data.data.title);
      } else {
        console.log('❌ 文章验证失败');
        return;
      }

      // 3. 删除文章
      console.log('\n🗑️  步骤3: 删除文章...');
      console.log('   发送DELETE请求...');
      
      const deleteStart = Date.now();
      
      try {
        const deleteResponse = await axios.delete(`http://localhost:3002/api/articles/${articleId}`, {
          timeout: 10000 // 10秒超时
        });
        
        const deleteTime = Date.now() - deleteStart;
        console.log(`✅ 删除成功，耗时: ${deleteTime}ms`);
        console.log('   响应:', deleteResponse.data);

        // 4. 验证文章已删除
        console.log('\n✅ 步骤4: 验证文章已删除...');
        try {
          const verifyResponse = await axios.get(`http://localhost:3002/api/articles/${articleId}`);
          console.log('❌ 文章仍然存在，删除可能失败');
        } catch (error) {
          if (error.response?.status === 404 || error.response?.data?.message?.includes('not found')) {
            console.log('✅ 文章已成功删除');
          } else {
            console.log('❓ 验证删除状态时出现意外错误:', error.message);
          }
        }

      } catch (deleteError) {
        const deleteTime = Date.now() - deleteStart;
        console.log(`❌ 删除失败，耗时: ${deleteTime}ms`);
        
        if (deleteError.code === 'ECONNABORTED' || deleteError.message.includes('timeout')) {
          console.log('⏰ 删除操作超时');
        } else {
          console.log('💥 删除操作错误:', deleteError.response?.data || deleteError.message);
        }
      }

    } else {
      console.log('❌ 文章创建失败:', createResponse.data);
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  } finally {
    console.log('\n🔄 关闭测试服务器...');
    await app.close();
    console.log('🏁 测试完成');
  }
}

// 运行测试
if (require.main === module) {
  testDeleteAPI().catch(console.error);
}

export { testDeleteAPI }; 