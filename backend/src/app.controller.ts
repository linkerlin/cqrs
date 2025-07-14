import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
@ApiTags('info')
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Get API information' })
  @ApiResponse({ status: 200, description: 'API information' })
  getInfo() {
    return {
      name: 'CQRS CMS API',
      version: '1.0.0',
      description: 'A CMS system built with CQRS architecture and Redis',
      endpoints: {
        health: '/api/health',
        articles: '/api/articles',
        documentation: '/api/docs'
      },
      features: [
        'CQRS (Command Query Responsibility Segregation)',
        'Redis Message Queues',
        'Async Command Processing',
        'Intelligent Caching Strategy',
        'Real-time Performance Monitoring'
      ],
      usage: {
        'Get all articles': 'GET /api/articles',
        'Get article by ID': 'GET /api/articles/:id',
        'Create article': 'POST /api/articles',
        'Update article': 'PUT /api/articles/:id',
        'Delete article': 'DELETE /api/articles/:id',
        'Publish article': 'POST /api/articles/:id/publish'
      }
    };
  }
} 