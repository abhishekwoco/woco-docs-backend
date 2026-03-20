import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { TokenAuthGuard } from './guards/token-auth.guard';
import { WritePermissionGuard } from './guards/write-permission.guard';

@Controller('documents')
@UseGuards(TokenAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('create')
  @UseGuards(WritePermissionGuard)
  create(@Body() createDocumentDto: CreateDocumentDto) {
    return this.documentsService.create(createDocumentDto);
  }

  @Get()
  findAll(
    @Query('document_id') documentId?: string,
    @Query('slug') slug?: string,
    @Query('category_id') categoryId?: string,
    @Query('tags') tags?: string,
    @Query('published') published?: string,
    @Query('user_id') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // If document_id is provided, fetch that specific document
    if (documentId) {
      return this.documentsService.findOne(documentId);
    }

    // If slug is provided, fetch by slug
    if (slug) {
      return this.documentsService.findBySlug(slug);
    }

    // Parse pagination params (optional — omit for backward compat)
    const pagination = page
      ? { page: Math.max(1, parseInt(page, 10) || 1), limit: Math.min(100, Math.max(1, parseInt(limit || '20', 10))) }
      : undefined;

    // Apply filters
    if (categoryId) {
      return this.documentsService.findByCategoryId(categoryId, pagination);
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      return this.documentsService.findByTags(tagArray, pagination);
    }

    if (published === 'true') {
      return this.documentsService.findPublished(pagination);
    }

    if (userId) {
      return this.documentsService.findByUserId(userId, pagination);
    }

    // Return all documents if no filters
    return this.documentsService.findAll(pagination);
  }

  @Post('update')
  @UseGuards(WritePermissionGuard)
  update(@Body() updateDocumentDto: UpdateDocumentDto) {
    const { document_id, ...updateData } = updateDocumentDto;
    return this.documentsService.update(document_id, updateData);
  }

  @Post('reorder')
  @UseGuards(WritePermissionGuard)
  reorder(@Body() reorderDto: { documents: Array<{ id: string; order: number }> }) {
    return this.documentsService.reorderDocuments(reorderDto.documents);
  }

  @Post('delete')
  @UseGuards(WritePermissionGuard)
  remove(@Body() deleteDocumentDto: { document_id: string }) {
    const { document_id } = deleteDocumentDto;
    return this.documentsService.remove(document_id);
  }
}
