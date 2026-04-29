import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ObsidianService } from './obsidian.service';
import { ObsidianController } from './obsidian.controller';

@Module({
  imports: [AuthModule, IntegrationsModule],
  controllers: [ObsidianController],
  providers: [ObsidianService, TokenAuthGuard, AdminGuard],
})
export class ObsidianModule {}
