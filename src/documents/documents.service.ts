import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import pdfParse from 'pdf-parse';
import { Document, DocumentDocument } from './schemas/document.schema';
import type { MulterFile } from '../rag/types';
import { SettingsService, REFORMAT_MODEL_KEY } from '../settings/settings.service';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(Document.name) private documentModel: Model<DocumentDocument>,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Reformat raw document text into clean Markdown via the Orchestra LLM.
   * FORMATTING ONLY — content is preserved verbatim by the model prompt. This
   * returns the proposed Markdown; it does NOT save anything (the editor shows
   * it behind a review gate before the user accepts).
   */
  async reformat(
    text: string,
    opts: { service?: string; model?: string } = {},
  ): Promise<{ markdown: string; changed: boolean }> {
    if (!text || !text.trim()) {
      return { markdown: '', changed: false };
    }
    const orchestraUrl = this.config.get<string>('ORCHESTRA_URL') || 'http://localhost:8001';

    // Resolve the model: an explicit request override wins; otherwise use the
    // admin-pinned reformat model (a cloud model) if one is configured. When
    // neither is set, Orchestra falls back to its default chat service.
    let service = opts.service;
    let model = opts.model;
    if (!model) {
      const pinned = await this.settings.get(REFORMAT_MODEL_KEY);
      if (pinned) {
        service = service || 'ollama_cloud';
        model = pinned;
      }
    }

    let res: Response;
    try {
      res = await fetch(`${orchestraUrl}/api/rag/reformat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, service, model }),
        signal: AbortSignal.timeout(200_000),
      });
    } catch (err) {
      this.logger.error(`Orchestra reformat request failed: ${err}`);
      throw new HttpException('Reformat service unreachable', 502);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const detail = body?.detail || body?.message || 'Reformat failed';
      throw new HttpException(detail, res.status);
    }
    return res.json() as Promise<{ markdown: string; changed: boolean }>;
  }

  /** Slugify a title: lowercase, non-alphanumeric → hyphen, trim hyphens. */
  private slugify(text: string): string {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /** Return a slug guaranteed not to collide with an existing document. */
  private async uniqueSlug(base: string): Promise<string> {
    const root = this.slugify(base) || 'document';
    let candidate = root;
    let n = 1;
    // Loop until we find a free slug. Bounded in practice by the number of
    // same-named docs; the suffix grows monotonically so it always terminates.
    while (await this.documentModel.exists({ slug: candidate })) {
      candidate = `${root}-${n++}`;
    }
    return candidate;
  }

  /**
   * Create a document from an uploaded PDF: extract its text and store it as
   * the document body. The title defaults to the filename (sans extension).
   * The PDF binary itself is not retained — only the extracted text.
   */
  async createFromPdf(
    file: MulterFile,
    opts: { categoryId?: string; title?: string } = {},
  ): Promise<Document> {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('No PDF uploaded');
    }
    if (file.mimetype !== 'application/pdf' && !/\.pdf$/i.test(file.originalname || '')) {
      throw new BadRequestException('File must be a PDF');
    }

    let text = '';
    try {
      const parsed = await pdfParse(file.buffer);
      text = (parsed.text || '').trim();
    } catch (err) {
      this.logger.error(`PDF parse failed for "${file.originalname}": ${err}`);
      throw new BadRequestException('Could not read text from this PDF. It may be scanned or image-only.');
    }

    if (!text) {
      throw new BadRequestException(
        'No selectable text found in this PDF (it may be a scanned/image-only document).',
      );
    }

    if (opts.categoryId && !Types.ObjectId.isValid(opts.categoryId)) {
      throw new BadRequestException('Invalid categoryId');
    }

    const baseTitle =
      (opts.title && opts.title.trim()) ||
      (file.originalname || 'Untitled').replace(/\.pdf$/i, '').trim() ||
      'Untitled';
    const slug = await this.uniqueSlug(baseTitle);

    const created = new this.documentModel({
      title: baseTitle,
      slug,
      content: text,
      categoryId: opts.categoryId || undefined,
      isPublished: false,
    });
    const saved = await created.save();
    this.logger.log(`Created document "${baseTitle}" (${text.length} chars) from PDF "${file.originalname}"`);
    return saved;
  }

  /**
   * Helper: apply pagination to a query, or return all results if no pagination given.
   * Returns paginated result when params provided, plain array otherwise (backward compat).
   */
  private async paginate(
    filter: Record<string, any>,
    pagination?: PaginationParams,
  ): Promise<Document[] | PaginatedResult<Document>> {
    const query = this.documentModel
      .find(filter)
      .populate('categoryId')
      .sort({ order: 1 });

    if (!pagination) {
      return query.exec();
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      query.skip(skip).limit(limit).exec(),
      this.documentModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(createDocumentDto: any): Promise<Document> {
    // Check if slug already exists
    const existingDocument = await this.documentModel.findOne({
      slug: createDocumentDto.slug
    }).exec();

    if (existingDocument) {
      throw new BadRequestException('Document with this slug already exists');
    }

    const createdDocument = new this.documentModel(createDocumentDto);
    return createdDocument.save();
  }

  async findAll(pagination?: PaginationParams) {
    return this.paginate({}, pagination);
  }

  async findOne(id: string): Promise<Document | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Document not found');
    }

    const document = await this.documentModel
      .findById(id)
      .populate('categoryId')
      .exec();

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async update(id: string, updateDocumentDto: any): Promise<Document | null> {
    // If updating slug, check it doesn't conflict with existing documents
    if (updateDocumentDto.slug) {
      const existingDocument = await this.documentModel.findOne({
        slug: updateDocumentDto.slug,
        _id: { $ne: id }
      }).exec();

      if (existingDocument) {
        throw new BadRequestException('Document with this slug already exists');
      }
    }

    const updatedDocument = await this.documentModel
      .findByIdAndUpdate(id, updateDocumentDto, { new: true })
      .populate('categoryId')
      .exec();

    if (!updatedDocument) {
      throw new NotFoundException('Document not found');
    }

    return updatedDocument;
  }

  async remove(id: string): Promise<Document | null> {
    const deletedDocument = await this.documentModel.findByIdAndDelete(id).exec();

    if (!deletedDocument) {
      throw new NotFoundException('Document not found');
    }

    return deletedDocument;
  }

  async findBySlug(slug: string): Promise<Document | null> {
    const document = await this.documentModel
      .findOne({ slug })
      .populate('categoryId')
      .exec();

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async findByTags(tags: string[], pagination?: PaginationParams) {
    return this.paginate({ tags: { $in: tags } }, pagination);
  }

  async findByCategoryId(categoryId: string, pagination?: PaginationParams) {
    return this.paginate({ categoryId }, pagination);
  }

  async findPublished(pagination?: PaginationParams) {
    return this.paginate({ isPublished: true }, pagination);
  }

  async findByUserId(userId: string, pagination?: PaginationParams) {
    return this.paginate({ userId }, pagination);
  }

  async reorderDocuments(documentOrders: Array<{ id: string; order: number }>): Promise<void> {
    const updatePromises = documentOrders.map(({ id, order }) =>
      this.documentModel.findByIdAndUpdate(id, { order }).exec()
    );
    await Promise.all(updatePromises);
  }
}
