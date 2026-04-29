import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationsService } from '../integrations/integrations.service';

/**
 * Proxies Obsidian monitoring requests to the Orchestra service.
 *
 * Credentials (base URL + API key) live encrypted in MongoDB via the
 * IntegrationsService. On every request we resolve them and forward to
 * Orchestra via X-Obsidian-Url / X-Obsidian-Key headers — Orchestra never
 * holds the key itself.
 *
 * If no DB record exists OR the integration is disabled, we short-circuit
 * and return a "disabled" status without calling Orchestra at all.
 */
@Injectable()
export class ObsidianService {
  private readonly logger = new Logger(ObsidianService.name);
  private readonly orchestraUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly integrations: IntegrationsService,
  ) {
    this.orchestraUrl = this.config.get<string>('ORCHESTRA_URL', 'http://localhost:8001');
  }

  private async buildHeaders(): Promise<Record<string, string> | null> {
    const creds = await this.integrations.resolveObsidianCredentials();
    if (!creds) return null;
    // Diagnostic: log key length + first/last 2 chars (masked) so we can confirm
    // decryption produced the right length without leaking the secret to logs.
    const k = creds.apiKey;
    const mask = k.length <= 4
      ? '(too short)'
      : `${k.slice(0, 2)}…${k.slice(-2)} (len=${k.length})`;
    this.logger.log(`Obsidian request: url=${creds.baseUrl} key=${mask}`);
    return {
      'X-Obsidian-Url': creds.baseUrl,
      'X-Obsidian-Key': creds.apiKey,
    };
  }

  private async proxy(
    path: string,
    timeoutMs: number,
    disabledResponse: Record<string, unknown>,
  ): Promise<unknown> {
    const headers = await this.buildHeaders();
    if (!headers) {
      // No creds in DB or disabled — return the caller-specified shape so the
      // frontend receives the expected structure for this endpoint.
      return disabledResponse;
    }

    const url = `${this.orchestraUrl}/api/monitoring/obsidian${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      this.logger.error(`Orchestra obsidian${path} request failed: ${err}`);
      throw new HttpException('Orchestra service unreachable', HttpStatus.BAD_GATEWAY);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Orchestra obsidian${path} returned ${res.status}: ${text}`);
      throw new HttpException(text || 'Upstream error', res.status);
    }
    return res.json();
  }

  health(): Promise<unknown> {
    return this.proxy('/health', 15_000, {
      status: 'disabled',
      error:  'Obsidian integration not configured — set credentials under Settings on this page.',
    });
  }

  activity(limit: number): Promise<unknown> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    return this.proxy(`/activity?limit=${safeLimit}`, 30_000, {
      // Match the shape Orchestra returns on success so the frontend can safely
      // read `.files`, `.total_scanned`, etc. even when creds are missing.
      total_scanned: 0,
      returned:      0,
      cached_at:     0,
      files:         [],
    });
  }

  graph(force = false): Promise<unknown> {
    // Building the vault graph fetches every markdown file — give it a long budget.
    return this.proxy(`/graph${force ? '?force=true' : ''}`, 120_000, {
      total_files:       0,
      total_link_edges:  0,
      total_tag_edges:   0,
      generated_at:      0,
      nodes:             [],
      edges:             [],
    });
  }

  file(path: string): Promise<unknown> {
    const qs = `?path=${encodeURIComponent(path)}`;
    return this.proxy(`/file${qs}`, 15_000, {
      path:        path,
      content:     '',
      tags:        [],
      frontmatter: {},
      size:        0,
      modified_at: 0,
      created_at:  0,
    });
  }
}
