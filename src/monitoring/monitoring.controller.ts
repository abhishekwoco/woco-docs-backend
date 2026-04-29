import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import { MonitoringService } from './monitoring.service';

/**
 * Admin-only proxy to Orchestra's /api/monitoring/* endpoints.
 *
 *   GET /monitoring/summary                 — header banner (status + uptime + err%)
 *   GET /monitoring/health                  — dependency probes
 *   GET /monitoring/breakers                — circuit-breaker states
 *   GET /monitoring/turns/rollup?window=1h  — p95 + error rate + sparklines
 *   GET /monitoring/errors?limit=20         — recent error feed
 */
@Controller('monitoring')
@UseGuards(TokenAuthGuard, AdminGuard)
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}

  @Get('summary')
  summary() {
    return this.monitoring.summary();
  }

  @Get('health')
  health() {
    return this.monitoring.health();
  }

  @Get('breakers')
  breakers() {
    return this.monitoring.breakers();
  }

  @Get('turns/rollup')
  turnsRollup(@Query('window') window = '1h') {
    return this.monitoring.turnsRollup(window);
  }

  @Get('errors')
  recentErrors(@Query('limit') limit = '20') {
    return this.monitoring.recentErrors(Number(limit));
  }

  @Get('turns/recent')
  recentTurns(@Query('limit') limit = '25') {
    return this.monitoring.recentTurns(Number(limit));
  }

  @Get('llm')
  llm() {
    return this.monitoring.llm();
  }
}
