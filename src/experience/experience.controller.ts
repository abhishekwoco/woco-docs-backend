import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import { ExperienceService } from './experience.service';

@Controller('experience')
@UseGuards(TokenAuthGuard, AdminGuard)
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @Get()
  list(
    @Query('offset') offset = '0',
    @Query('limit')  limit  = '50',
  ) {
    return this.experienceService.list(Number(offset), Number(limit));
  }

  @Get('stats/count')
  stats() { return this.experienceService.stats(); }

  @Post('repair')
  @HttpCode(HttpStatus.OK)
  repair() { return this.experienceService.repair(); }

  @Get(':id')
  getOne(@Param('id') id: string) { return this.experienceService.getOne(id); }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown) { return this.experienceService.create(body); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.experienceService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) { return this.experienceService.remove(id); }
}
