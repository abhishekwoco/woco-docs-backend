import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AiChatService } from './ai-chat.service';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { CreateChatSessionDto, SendMessageDto } from './dto/create-chat.dto';

@Controller('ai-chat')
@UseGuards(TokenAuthGuard)
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  // ──────────────────────────────────────────────
  // HEALTH CHECK
  // ──────────────────────────────────────────────

  @Get('health')
  getHealth() {
    return this.aiChatService.getHealth();
  }

  // ──────────────────────────────────────────────
  // CHAT SESSION ENDPOINTS (Frontend → NestJS)
  // ──────────────────────────────────────────────

  @Post('sessions/create')
  createSession(@Req() req: any, @Body() dto: CreateChatSessionDto) {
    return this.aiChatService.createSession(req.user, dto.title);
  }

  @Get('sessions')
  getUserSessions(@Req() req: any) {
    return this.aiChatService.getUserSessions(req.user);
  }

  @Get('sessions/:id')
  getSession(@Req() req: any, @Param('id') id: string) {
    return this.aiChatService.getSessionById(id, req.user.userId);
  }

  @Post('sessions/delete')
  deleteSession(@Req() req: any, @Body() body: { session_id: string }) {
    return this.aiChatService.deleteSession(body.session_id, req.user.userId);
  }

  // ──────────────────────────────────────────────
  // CHAT MESSAGING (Frontend → NestJS → Orchestra)
  // Always streams via SSE
  // ──────────────────────────────────────────────

  @Post('send')
  async sendMessage(
    @Req() req: any,
    @Res() res: Response,
    @Body() dto: SendMessageDto,
  ) {
    await this.aiChatService.sendMessage(
      dto.session_id,
      req.user,
      dto.message,
      res,
    );
  }

  // ──────────────────────────────────────────────
  // DOCUMENT FEED (Orchestra → NestJS)
  // ──────────────────────────────────────────────

  @Get('documents/feed')
  getDocumentsForIngestion() {
    return this.aiChatService.getDocumentsForIngestion();
  }

  // ──────────────────────────────────────────────
  // INGESTION MANAGEMENT
  // ──────────────────────────────────────────────

  @Get('ingestion/status')
  getIngestionStatus() {
    return this.aiChatService.getIngestionStatus();
  }

  @Post('ingestion/trigger')
  triggerIngestion(@Req() req: any, @Body() body: { persona?: string }) {
    const token = req.headers['access-token'];
    return this.aiChatService.triggerIngestion(body.persona, token);
  }

  @Post('ingestion/document/:id')
  ingestDocument(@Param('id') documentId: string) {
    return this.aiChatService.ingestDocumentById(documentId);
  }
}
