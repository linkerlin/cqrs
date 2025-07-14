import { Injectable, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ModuleRef } from '@nestjs/core';

export interface CommandHandler {
  handle(payload: any): Promise<any>;
}

@Processor('command_queue')
export class BullMqProcessorService extends WorkerHost implements OnModuleInit {
  private commandHandlers = new Map<string, CommandHandler>();

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  onModuleInit() {
    // This is where you would register your handlers.
    // We will do this from the respective modules (e.g., ArticleModule).
  }

  registerCommandHandler(commandType: string, handler: CommandHandler) {
    this.commandHandlers.set(commandType, handler);
    console.log(`[BullMQ] Registered command handler for: ${commandType}`);
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { name: commandType, data: payload } = job;
    console.log(`[BullMQ] Processing job: ${commandType}`);

    const handler = this.commandHandlers.get(commandType);
    if (!handler) {
      throw new Error(`No handler found for command type: ${commandType}`);
    }

    try {
      const result = await handler.handle(payload);
      return result;
    } catch (error) {
      console.error(`[BullMQ] Error processing job ${commandType}:`, error);
      throw error; // BullMQ will catch this and mark the job as failed
    }
  }
}
