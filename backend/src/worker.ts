import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(WorkerModule);
  // BullMQ worker will start automatically once the application context is created
  console.log('BullMQ Worker started');
}

bootstrap();