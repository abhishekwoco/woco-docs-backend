import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { MulterFile } from './types';
import { FileInterceptor } from '@nestjs/platform-express';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import { RagService } from './rag.service';
import { IngestUploadDto } from './dto/ingest-upload.dto';
import { IngestTextDto } from './dto/ingest-text.dto';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { BulkIngestDto } from './dto/bulk-ingest.dto';

@Controller('rag')
@UseGuards(TokenAuthGuard, AdminGuard)
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('ingest/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async ingestUpload(
    @UploadedFile() file: MulterFile,
    @Body() dto: IngestUploadDto,
  ) {
    return this.ragService.ingestFile(file, dto);
  }

  @Post('ingest/text')
  @HttpCode(HttpStatus.OK)
  async ingestText(@Body() dto: IngestTextDto) {
    return this.ragService.ingestText(dto);
  }

  @Post('ingest/document/:id')
  @HttpCode(HttpStatus.OK)
  async ingestDocument(
    @Param('id') id: string,
    @Body() dto: IngestDocumentDto,
  ) {
    return this.ragService.ingestDocument(id, dto);
  }

  @Post('ingest/bulk')
  @HttpCode(HttpStatus.OK)
  async bulkIngest(@Body() dto: BulkIngestDto) {
    return this.ragService.bulkIngest(dto);
  }

  @Post('ingest/reindex-failed')
  @HttpCode(HttpStatus.OK)
  async reindexFailed() {
    return this.ragService.reindexFailed();
  }

  @Get('schema')
  async getSchema() {
    return this.ragService.getSchema();
  }

  @Get('integrity')
  async getIntegrity() {
    return this.ragService.getIntegrity();
  }
}
