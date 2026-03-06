import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document, DocumentSchema } from './schemas/document.schema';
import { AuthModule } from '../auth/auth.module';
import { TokenAuthGuard } from './guards/token-auth.guard';
import { WritePermissionGuard } from './guards/write-permission.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Document.name, schema: DocumentSchema }]),
    AuthModule,
  ],
  providers: [DocumentsService, TokenAuthGuard, WritePermissionGuard],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
