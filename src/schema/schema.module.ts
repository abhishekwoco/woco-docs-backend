import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import { SchemaController } from './schema.controller';
import { SchemaService } from './schema.service';

@Module({
  imports: [AuthModule],
  controllers: [SchemaController],
  providers: [SchemaService, TokenAuthGuard, AdminGuard],
})
export class SchemaModule {}
