import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { TokenAuthGuard } from './guards/token-auth.guard';
import { WritePermissionGuard } from './guards/write-permission.guard';

@Controller('documents')
@UseGuards(TokenAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('create')
  @UseGuards(WritePermissionGuard)
  create(@Body() createDocumentDto: any) {
    return this.documentsService.create(createDocumentDto);
  }

  @Get()
  findAll(
    @Query('document_id') documentId?: string,
    @Query('slug') slug?: string,
    @Query('category') category?: string,
    @Query('tags') tags?: string,
  ) {
    // If document_id is provided, fetch that specific document
    if (documentId) {
      return this.documentsService.findOne(documentId);
    }

    // If slug is provided, fetch by slug
    if (slug) {
      return this.documentsService.findBySlug(slug);
    }

    // Apply filters
    if (category) {
      return this.documentsService.findByCategory(category);
    }
    if (tags) {
      const tagArray = tags.split(',');
      return this.documentsService.findByTags(tagArray);
    }

    // Return all documents if no filters
    return this.documentsService.findAll();
  }

  @Post('update')
  @UseGuards(WritePermissionGuard)
  update(@Body() updateDocumentDto: any) {
    const { document_id, ...updateData } = updateDocumentDto;
    return this.documentsService.update(document_id, updateData);
  }

  @Post('delete')
  @UseGuards(WritePermissionGuard)
  remove(@Body() deleteDocumentDto: any) {
    const { document_id } = deleteDocumentDto;
    return this.documentsService.remove(document_id);
  }
}
