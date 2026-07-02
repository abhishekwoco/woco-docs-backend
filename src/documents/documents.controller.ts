import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MulterFile } from '../rag/types';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ReorderDocumentsDto } from './dto/reorder-documents.dto';
import { DeleteDocumentDto } from './dto/delete-document.dto';
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

  /**
   * POST /documents/upload-pdf — create a document from an uploaded PDF.
   * Multipart: `file` (the PDF) + optional `categoryId` / `title` text fields.
   */
  @Post('upload-pdf')
  @UseGuards(WritePermissionGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  uploadPdf(
    @UploadedFile() file: MulterFile,
    @Body() body: { categoryId?: string; title?: string },
  ) {
    return this.documentsService.createFromPdf(file, {
      categoryId: body?.categoryId,
      title: body?.title,
    });
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

  /**
   * POST /documents/reformat — AI-reformat text into clean Markdown.
   * Returns the proposed Markdown for the editor to review; saves nothing.
   */
  @Post('reformat')
  @UseGuards(WritePermissionGuard)
  @HttpCode(HttpStatus.OK)
  reformat(@Body() body: { text: string; service?: string; model?: string }) {
    return this.documentsService.reformat(body?.text, {
      service: body?.service,
      model: body?.model,
    });
  }

  @Post('reorder')
  @UseGuards(WritePermissionGuard)
  reorder(@Body() reorderDto: ReorderDocumentsDto) {
    return this.documentsService.reorderDocuments(reorderDto.documents);
  }

  @Post('delete')
  @UseGuards(WritePermissionGuard)
  remove(@Body() deleteDocumentDto: DeleteDocumentDto) {
    return this.documentsService.remove(deleteDocumentDto.document_id);
  }
}
