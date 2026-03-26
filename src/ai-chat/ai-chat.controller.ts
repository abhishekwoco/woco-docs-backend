import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { AiChatService } from './ai-chat.service';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { CreateChatSessionDto, SendMessageDto } from './dto/create-chat.dto';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request';

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
  createSession(@Req() req: AuthenticatedRequest, @Body() dto: CreateChatSessionDto) {
    return this.aiChatService.createSession(req.user, dto.title);
  }

  @Get('sessions')
  getUserSessions(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pagination = page
      ? { page: Math.max(1, parseInt(page, 10) || 1), limit: Math.min(50, Math.max(1, parseInt(limit || '20', 10))) }
      : undefined;
    return this.aiChatService.getUserSessions(req.user, pagination);
  }

  @Get('sessions/:id')
  getSession(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.aiChatService.getSessionById(id, req.user.userId);
  }

  @Post('sessions/delete')
  deleteSession(@Req() req: AuthenticatedRequest, @Body() body: { session_id: string }) {
    return this.aiChatService.deleteSession(body.session_id, req.user.userId);
  }

  // ──────────────────────────────────────────────
  // CHAT MESSAGING (Frontend → NestJS → Orchestra)
  // Always streams via SSE
  // ──────────────────────────────────────────────

  @SkipThrottle()
  @Post('send')
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Body() dto: SendMessageDto,
  ) {
    await this.aiChatService.sendMessage(
      dto.session_id,
      req.user,
      dto.message,
      res,
      dto.client_schema,
      dto.model,
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
  getIngestionStatus(@Req() req: AuthenticatedRequest) {
    return this.aiChatService.getIngestionStatus(req.user.token);
  }

  @SkipThrottle()
  @Post('ingestion/trigger')
  triggerIngestion(@Req() req: AuthenticatedRequest, @Body() body: { persona?: string }) {
    return this.aiChatService.triggerIngestion(body.persona, req.user.token);
  }

  @Post('ingestion/document/:id')
  ingestDocument(@Req() req: AuthenticatedRequest, @Param('id') documentId: string) {
    return this.aiChatService.ingestDocumentById(documentId, req.user.token);
  }

  @Post('ingestion/schema-reference')
  updateSchemaReference() {
    return this.aiChatService.updateSchemaReference();
  }

  // ──────────────────────────────────────────────
  // DATABASE QUERY TOOL — Client list proxy
  // ──────────────────────────────────────────────

  @Get('db/clients')
  getDbClients(@Req() req: AuthenticatedRequest) {
    return this.aiChatService.getDbClients(req.user.token);
  }

  // ──────────────────────────────────────────────
  // FEEDBACK — User rates responses for learning
  // ──────────────────────────────────────────────

  @Post('feedback')
  submitFeedback(@Body() body: { query: string; intent: string; rating: string; feedback?: string }) {
    return this.aiChatService.submitFeedback(body);
  }

  @Post('user-feedback')
  saveUserFeedback(
    @Req() req: AuthenticatedRequest,
    @Body() body: { sessionId: string; query: string; response: string; intent: string; rating: string; feedback?: string; model?: string },
  ) {
    return this.aiChatService.saveFeedback(req.user, body);
  }

  @Get('user-feedback/stats')
  getFeedbackStats() {
    return this.aiChatService.getFeedbackStats();
  }

  @Post('feedback/generate')
  generateExperiences(@Req() req: AuthenticatedRequest) {
    return this.aiChatService.generateExperiences(req.user.token);
  }

  @Get('conversations/feed')
  getConversationsForLearning() {
    return this.aiChatService.getConversationsForLearning();
  }

  @Get('monitoring/dashboard')
  getMonitoringDashboard() {
    return this.aiChatService.getMonitoringDashboard();
  }
}
