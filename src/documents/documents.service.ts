import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Document, DocumentDocument } from './schemas/document.schema';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document.name) private documentModel: Model<DocumentDocument>,
  ) {}

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

  async findAll(): Promise<Document[]> {
    return this.documentModel
      .find()
      .populate('categoryId')
      .sort({ order: 1 })
      .exec();
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

  async findByTags(tags: string[]): Promise<Document[]> {
    return this.documentModel
      .find({ tags: { $in: tags } })
      .populate('categoryId')
      .sort({ order: 1 })
      .exec();
  }

  async findByCategoryId(categoryId: string): Promise<Document[]> {
    return this.documentModel
      .find({ categoryId })
      .populate('categoryId')
      .sort({ order: 1 })
      .exec();
  }

  async findPublished(): Promise<Document[]> {
    return this.documentModel
      .find({ isPublished: true })
      .populate('categoryId')
      .sort({ order: 1 })
      .exec();
  }

  async findByUserId(userId: string): Promise<Document[]> {
    return this.documentModel
      .find({ userId })
      .populate('categoryId')
      .sort({ order: 1 })
      .exec();
  }

  async reorderDocuments(documentOrders: Array<{ id: string; order: number }>): Promise<void> {
    const updatePromises = documentOrders.map(({ id, order }) =>
      this.documentModel.findByIdAndUpdate(id, { order }).exec()
    );
    await Promise.all(updatePromises);
  }
}
