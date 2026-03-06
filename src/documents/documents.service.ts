import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Document, DocumentDocument } from './schemas/document.schema';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document.name) private documentModel: Model<DocumentDocument>,
  ) {}

  async create(createDocumentDto: any): Promise<Document> {
    const createdDocument = new this.documentModel(createDocumentDto);
    return createdDocument.save();
  }

  async findAll(): Promise<Document[]> {
    return this.documentModel.find().exec();
  }

  async findOne(id: string): Promise<Document | null> {
    return this.documentModel.findById(id).exec();
  }

  async update(id: string, updateDocumentDto: any): Promise<Document | null> {
    return this.documentModel
      .findByIdAndUpdate(id, updateDocumentDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<Document | null> {
    return this.documentModel.findByIdAndDelete(id).exec();
  }

  async findBySlug(slug: string): Promise<Document | null> {
    return this.documentModel.findOne({ slug }).exec();
  }

  async findByTags(tags: string[]): Promise<Document[]> {
    return this.documentModel.find({ tags: { $in: tags } }).exec();
  }

  async findByCategory(category: string): Promise<Document[]> {
    return this.documentModel.find({ category }).exec();
  }

  async findPublished(): Promise<Document[]> {
    return this.documentModel.find({ isPublished: true }).exec();
  }

  async findByUserId(userId: string): Promise<Document[]> {
    return this.documentModel.find({ userId }).exec();
  }
}
