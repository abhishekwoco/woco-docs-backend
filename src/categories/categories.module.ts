import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category, CategorySchema } from './schemas/category.schema';
import { Document, DocumentSchema } from '../documents/schemas/document.schema';
import { AuthModule } from '../auth/auth.module';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { WritePermissionGuard } from '../documents/guards/write-permission.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Document.name, schema: DocumentSchema },
    ]),
    AuthModule,
  ],
  providers: [CategoriesService, TokenAuthGuard, WritePermissionGuard],
  controllers: [CategoriesController],
  exports: [CategoriesService],
})
export class CategoriesModule {}
