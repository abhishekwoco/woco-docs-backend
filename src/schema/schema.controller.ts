import { Controller, Get, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import { SchemaService } from './schema.service';

@Controller('schema')
@UseGuards(TokenAuthGuard, AdminGuard)
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Get('status')
  getStatus() { return this.schemaService.getStatus(); }

  @Post('reindex')
  @HttpCode(HttpStatus.OK)
  reindexAll() { return this.schemaService.reindexAll(); }

  @Post('reindex/master')
  @HttpCode(HttpStatus.OK)
  reindexMaster() { return this.schemaService.reindexMaster(); }

  @Post('reindex/client')
  @HttpCode(HttpStatus.OK)
  reindexClient() { return this.schemaService.reindexClient(); }

  @Post('reindex/companies')
  @HttpCode(HttpStatus.OK)
  reindexCompanies() { return this.schemaService.reindexCompanies(); }

  @Get('companies')
  getCompanies() { return this.schemaService.getCompanies(); }
}
