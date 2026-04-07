import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExperienceService {
  private readonly logger = new Logger(ExperienceService.name);
  private readonly orchestraUrl: string;

  constructor(private readonly config: ConfigService) {
    this.orchestraUrl = this.config.get<string>('ORCHESTRA_URL', 'http://localhost:8001');
  }

  private async proxy(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: unknown,
  ): Promise<unknown> {
    const url = `${this.orchestraUrl}/experience${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      this.logger.error(`Orchestra experience${path} failed: ${err}`);
      throw new HttpException('Orchestra service unreachable', HttpStatus.BAD_GATEWAY);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Orchestra experience${path} returned ${res.status}: ${text}`);
      throw new HttpException(text || 'Upstream error', res.status);
    }
    return res.json();
  }

  list(offset = 0, limit = 50)      { return this.proxy(`?offset=${offset}&limit=${limit}`, 'GET'); }
  stats()                            { return this.proxy('/stats/count', 'GET'); }
  getOne(id: string)                 { return this.proxy(`/${id}`, 'GET'); }
  create(body: unknown)              { return this.proxy('', 'POST', body); }
  update(id: string, body: unknown)  { return this.proxy(`/${id}`, 'PUT', body); }
  remove(id: string)                 { return this.proxy(`/${id}`, 'DELETE'); }
}
