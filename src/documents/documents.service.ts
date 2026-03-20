import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Document, DocumentDocument } from './schemas/document.schema';

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
  constructor(
    @InjectModel(Document.name) private documentModel: Model<DocumentDocument>,
  ) {}

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
