import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import { SettingsService, REFORMAT_MODEL_KEY } from './settings.service';

/**
 * Admin-only runtime settings. Currently just the pinned "reformat model" —
 * which cloud model the doc editor's AI reformat uses.
 */
@Controller('settings')
@UseGuards(TokenAuthGuard, AdminGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('reformat-model')
  async getReformatModel() {
    return { model: (await this.settings.get(REFORMAT_MODEL_KEY)) ?? '' };
  }

  @Put('reformat-model')
  async setReformatModel(@Body() body: { model?: string }) {
    const model = (body?.model ?? '').trim();
    await this.settings.set(REFORMAT_MODEL_KEY, model);
    return { model };
  }
}
