import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { MulterError } from 'multer';
import type { Response } from 'express';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(err: MulterError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      err.code === 'LIMIT_FILE_SIZE' ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST;
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 8 MB).' : `Upload error: ${err.message}`;
    res.status(status).json({ statusCode: status, message });
  }
}
