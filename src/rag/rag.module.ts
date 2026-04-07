import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '../auth/auth.module';
import { Document, DocumentSchema } from '../documents/schemas/document.schema';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Document.name, schema: DocumentSchema }]),
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB
      },
    }),
  ],
  controllers: [RagController],
  providers: [RagService, TokenAuthGuard, AdminGuard],
})
export class RagModule {}
