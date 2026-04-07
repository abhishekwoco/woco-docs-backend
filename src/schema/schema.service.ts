import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SchemaService {
  private readonly logger = new Logger(SchemaService.name);
  private readonly orchestraUrl: string;

  constructor(private readonly config: ConfigService) {
    this.orchestraUrl = this.config.get<string>('ORCHESTRA_URL', 'http://localhost:8001');
  }

  private async proxy(path: string, method: 'GET' | 'POST'): Promise<unknown> {
    const url = `${this.orchestraUrl}/api/schema${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        signal: AbortSignal.timeout(300_000), // reindex can take a while
      });
    } catch (err) {
      this.logger.error(`Orchestra schema${path} failed: ${err}`);
      throw new HttpException('Orchestra service unreachable', HttpStatus.BAD_GATEWAY);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Orchestra schema${path} returned ${res.status}: ${text}`);
      throw new HttpException(text || 'Upstream error', res.status);
    }
    return res.json();
  }

  getStatus()          { return this.proxy('/status',             'GET');  }
  reindexAll()         { return this.proxy('/reindex',            'POST'); }
  reindexMaster()      { return this.proxy('/reindex/master',     'POST'); }
  reindexClient()      { return this.proxy('/reindex/client',     'POST'); }
  reindexCompanies()   { return this.proxy('/reindex/companies',  'POST'); }
  getCompanies()       { return this.proxy('/companies',          'GET');  }
}
