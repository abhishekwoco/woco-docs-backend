import {
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MulterFile } from '../rag/types';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { UploadsService } from './uploads.service';
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES } from './uploads.constants';
import { MulterExceptionFilter } from './multer-exception.filter';

@Controller('uploads')
@UseGuards(TokenAuthGuard)
@UseFilters(MulterExceptionFilter)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * POST /uploads/image — store an image on local disk, return its URL path.
   * Used by the doc editor's image insert (toolbar / drag-drop / paste).
   */
  @Post('image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_IMAGE_BYTES },
    fileFilter: (_req, file, cb) => cb(null, ALLOWED_IMAGE_MIME.has(file.mimetype)),
  }))
  uploadImage(@UploadedFile() file: MulterFile) {
    return this.uploadsService.saveImage(file);
  }
}
