import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MulterFile } from './types';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Document, DocumentDocument } from '../documents/schemas/document.schema';
import { IngestUploadDto } from './dto/ingest-upload.dto';
import { IngestTextDto } from './dto/ingest-text.dto';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { BulkIngestDto } from './dto/bulk-ingest.dto';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly orchestraUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Document.name) private readonly documentModel: Model<DocumentDocument>,
  ) {
    this.orchestraUrl = this.configService.get<string>('ORCHESTRA_URL', 'http://localhost:8001');
  }

  async ingestFile(file: MulterFile, dto: IngestUploadDto): Promise<unknown> {
    const url = `${this.orchestraUrl}/api/rag/ingest/file`;

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
    formData.append('file', blob, file.originalname);
    formData.append('persona', dto.persona);
    if (dto.category) {
      formData.append('category', dto.category);
    }
    if (dto.instructions) {
      formData.append('instructions', dto.instructions);
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(120_000),
        // Do NOT set Content-Type — let FormData set it with the boundary
      });
    } catch (err) {
      this.logger.error(`Orchestra ingest/file request failed: ${err}`);
      throw new HttpException('Orchestra service unreachable', HttpStatus.BAD_GATEWAY);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Orchestra ingest/file returned ${res.status}: ${text}`);
      throw new HttpException(text || 'Upstream error', res.status);
    }

    return res.json();
  }

  async ingestText(dto: IngestTextDto): Promise<unknown> {
    const url = `${this.orchestraUrl}/api/rag/ingest/text`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: dto.text,
          persona: dto.persona,
          category: dto.category ?? '',
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      this.logger.error(`Orchestra ingest/text request failed: ${err}`);
      throw new HttpException('Orchestra service unreachable', HttpStatus.BAD_GATEWAY);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Orchestra ingest/text returned ${res.status}: ${text}`);
      throw new HttpException(text || 'Upstream error', res.status);
    }

    return res.json();
  }

  async ingestDocument(docId: string, dto: IngestDocumentDto): Promise<unknown> {
    const doc = await this.documentModel.findById(docId).populate('categoryId').exec();
    if (!doc) {
      throw new HttpException(`Document ${docId} not found`, HttpStatus.NOT_FOUND);
    }

    // categoryId is populated — extract name and persona from the category object
    const catObj = doc.categoryId as any;
    const categoryName = catObj?.name ?? catObj?.slug ?? doc.category ?? '';
    const persona = catObj?.persona?.toLowerCase?.() === 'dev' ? 'dev' : 'cs';

    const payload = {
      text: doc.content,
      persona,
      doc_id: docId,
      category: dto.category ?? categoryName,
      title: doc.title,
    };

    const url = `${this.orchestraUrl}/api/rag/ingest/text`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      this.logger.error(`Orchestra ingest/document request failed for ${docId}: ${err}`);
      throw new HttpException('Orchestra service unreachable', HttpStatus.BAD_GATEWAY);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Orchestra ingest/document returned ${res.status} for ${docId}: ${text}`);
      throw new HttpException(text || 'Upstream error', res.status);
    }

    return res.json();
  }

  async bulkIngest(dto: BulkIngestDto): Promise<{ results: unknown[]; total: number; succeeded: number; failed: number }> {
    const results: unknown[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const docId of dto.documentIds) {
      try {
        const result = await this.ingestDocument(docId, {});
        results.push({ docId, status: 'ok', result });
        succeeded++;
      } catch (err: any) {
        this.logger.error(`Bulk ingest failed for doc ${docId}: ${err?.message}`);
        results.push({ docId, status: 'error', message: err?.message ?? 'Unknown error' });
        failed++;
      }
    }

    return { results, total: dto.documentIds.length, succeeded, failed };
  }

  async reindexFailed(): Promise<unknown> {
    const url = `${this.orchestraUrl}/api/rag/ingest/reindex-failed`;

    let res: Response;
    try {
      res = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(30_000) });
    } catch (err) {
      this.logger.error(`Orchestra reindex-failed request failed: ${err}`);
      throw new HttpException('Orchestra service unreachable', HttpStatus.BAD_GATEWAY);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Orchestra reindex-failed returned ${res.status}: ${text}`);
      throw new HttpException(text || 'Upstream error', res.status);
    }

    return res.json();
  }

  async getSchema(): Promise<unknown> {
    const url = `${this.orchestraUrl}/api/rag/schema`;

    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    } catch (err) {
      this.logger.error(`Orchestra schema request failed: ${err}`);
      throw new HttpException('Orchestra service unreachable', HttpStatus.BAD_GATEWAY);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Orchestra schema returned ${res.status}: ${text}`);
      throw new HttpException(text || 'Upstream error', res.status);
    }

    return res.json();
  }

  async getIntegrity(): Promise<unknown> {
    const url = `${this.orchestraUrl}/api/rag/integrity`;

    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    } catch (err) {
      this.logger.error(`Orchestra integrity request failed: ${err}`);
      throw new HttpException('Orchestra service unreachable', HttpStatus.BAD_GATEWAY);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Orchestra integrity returned ${res.status}: ${text}`);
      throw new HttpException(text || 'Upstream error', res.status);
    }

    return res.json();
  }
}
