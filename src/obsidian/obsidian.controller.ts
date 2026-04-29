import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import { ObsidianService } from './obsidian.service';

/**
 * Admin-only proxy for Obsidian monitoring endpoints.
 *
 *   GET /obsidian/health            — connection status + version + cert info
 *   GET /obsidian/activity?limit=20 — recent file modifications in the vault
 */
@Controller('obsidian')
@UseGuards(TokenAuthGuard, AdminGuard)
export class ObsidianController {
  constructor(private readonly obsidianService: ObsidianService) {}

  @Get('health')
  health() {
    return this.obsidianService.health();
  }

  @Get('activity')
  activity(@Query('limit') limit = '20') {
    return this.obsidianService.activity(Number(limit));
  }

  @Get('graph')
  graph(@Query('force') force?: string) {
    return this.obsidianService.graph(force === 'true');
  }

  @Get('file')
  file(@Query('path') path: string) {
    return this.obsidianService.file(path);
  }
}
