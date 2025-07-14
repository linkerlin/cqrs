import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '服务正常' })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'cqrs-cms-backend',
      version: '1.0.0'
    };
  }
} 