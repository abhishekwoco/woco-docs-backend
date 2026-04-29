import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin proxy around Orchestra's `/api/monitoring/*` endpoints that power the
 * admin AI Dashboard. All calls are GETs; data aggregation lives in Orchestra.
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly orchestraUrl: string;

  constructor(private readonly config: ConfigService) {
    this.orchestraUrl = this.config.get<string>('ORCHESTRA_URL', 'http://localhost:8001');
  }

  private async proxy(path: string, timeoutMs = 15_000): Promise<unknown> {
    const url = `${this.orchestraUrl}/api/monitoring${path}`;
    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      this.logger.error(`Orchestra monitoring${path} failed: ${err}`);
      throw new HttpException('Orchestra service unreachable', HttpStatus.BAD_GATEWAY);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Orchestra monitoring${path} returned ${res.status}: ${text}`);
      throw new HttpException(text || 'Upstream error', res.status);
    }
    return res.json();
  }

  summary()                         { return this.proxy('/summary', 10_000); }
  health()                          { return this.proxy('/health',  10_000); }
  breakers()                        { return this.proxy('/health/breakers', 5_000); }
  turnsRollup(window: string)       { return this.proxy(`/turns/rollup?window=${encodeURIComponent(window)}`, 10_000); }
  recentErrors(limit: number)       {
    const safe = Math.max(1, Math.min(Number(limit) || 20, 100));
    return this.proxy(`/errors?limit=${safe}`, 10_000);
  }
  recentTurns(limit: number)        {
    const safe = Math.max(1, Math.min(Number(limit) || 25, 100));
    return this.proxy(`/turns/recent?limit=${safe}`, 10_000);
  }
  llm()                             { return this.proxy('/llm', 5_000); }
}
