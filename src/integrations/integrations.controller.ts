import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import { IntegrationsService } from './integrations.service';
import { UpdateObsidianDto } from './dto/update-obsidian.dto';

/**
 * Admin-only CRUD for third-party integration configs.
 *
 *   GET    /integrations/obsidian   — current config (never returns the decrypted key)
 *   PUT    /integrations/obsidian   — create or update
 *   DELETE /integrations/obsidian   — remove entirely
 */
@Controller('integrations')
@UseGuards(TokenAuthGuard, AdminGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('obsidian')
  async getObsidian() {
    const config = await this.integrations.getObsidian();
    if (!config) {
      return {
        type:      'obsidian',
        enabled:   false,
        baseUrl:   '',
        hasApiKey: false,
      };
    }
    return config;
  }

  @Put('obsidian')
  async upsertObsidian(
    @Body() dto: UpdateObsidianDto,
    @Req() req: any,
  ) {
    return this.integrations.upsertObsidian(dto, req.user?.userId);
  }

  @Delete('obsidian')
  @HttpCode(HttpStatus.OK)
  async deleteObsidian() {
    await this.integrations.deleteObsidian();
    return { deleted: true, type: 'obsidian' };
  }
}
