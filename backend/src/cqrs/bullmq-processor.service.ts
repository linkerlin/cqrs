import { Injectable, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ModuleRef } from '@nestjs/core';
import {
  ArticleCreateHandler,
  ArticleUpdateHandler,
  ArticleDeleteHandler,
  ArticlePublishHandler,
  ArticleViewIncrementHandler,
  ArticleGetHandler,
  ArticleGetBySlugHandler,
  ArticleGetListHandler,
} from '../modules/article/article.handler';

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
    // Register all command handlers with the BullMQ processor
    this.registerCommandHandler('CREATE_ARTICLE', this.moduleRef.get(ArticleCreateHandler));
    this.registerCommandHandler('UPDATE_ARTICLE', this.moduleRef.get(ArticleUpdateHandler));
    this.registerCommandHandler('DELETE_ARTICLE', this.moduleRef.get(ArticleDeleteHandler));
    this.registerCommandHandler('PUBLISH_ARTICLE', this.moduleRef.get(ArticlePublishHandler));
    this.registerCommandHandler('INCREMENT_ARTICLE_VIEW', this.moduleRef.get(ArticleViewIncrementHandler));
    this.registerCommandHandler('GET_ARTICLE_BY_ID', this.moduleRef.get(ArticleGetHandler));
    this.registerCommandHandler('GET_ARTICLE_BY_SLUG', this.moduleRef.get(ArticleGetBySlugHandler));
    this.registerCommandHandler('GET_ARTICLE_LIST', this.moduleRef.get(ArticleGetListHandler));
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
