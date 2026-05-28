import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ExperienceController } from './experience.controller';
import { ExperienceService } from './experience.service';

@Module({
  imports: [AuthModule, IntegrationsModule],
  controllers: [ExperienceController],
  providers: [ExperienceService, TokenAuthGuard, AdminGuard],
})
export class ExperienceModule {}
