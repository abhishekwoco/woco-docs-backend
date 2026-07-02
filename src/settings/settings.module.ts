import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AppSetting, AppSettingSchema } from './schemas/app-setting.schema';
import { AuthModule } from '../auth/auth.module';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppSetting.name, schema: AppSettingSchema },
    ]),
    AuthModule,
  ],
  providers: [SettingsService, TokenAuthGuard, AdminGuard],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
