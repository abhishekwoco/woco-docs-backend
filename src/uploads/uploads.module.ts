import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { AuthModule } from '../auth/auth.module';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';

@Module({
  imports: [AuthModule],
  providers: [UploadsService, TokenAuthGuard],
  controllers: [UploadsController],
})
export class UploadsModule {}
