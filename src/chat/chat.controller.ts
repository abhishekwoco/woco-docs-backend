import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
@UseGuards(TokenAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);
  private readonly orchestraUrl: string;

  constructor(
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
  ) {
    this.orchestraUrl =
      this.configService.get<string>('ORCHESTRA_URL') || 'http://localhost:8001';
  }

  // ──────────────────────────────────────────────
  // SESSION MANAGEMENT
  // ──────────────────────────────────────────────

  @Post('sessions/create')
  createSession(@Req() req: any) {
    return this.chatService.createSession(req.user.userId);
  }

  @Get('sessions')
  getSessions(@Req() req: any) {
    return this.chatService.getUserSessions(req.user.userId);
  }

  @Get('sessions/:id')
  getSession(@Req() req: any, @Param('id') id: string) {
    return this.chatService.getSessionById(id, req.user.userId);
  }

  @Post('sessions/delete')
  deleteSession(@Req() req: any, @Body() body: { session_id: string }) {
    return this.chatService.deleteSession(body.session_id, req.user.userId);
  }

  // ──────────────────────────────────────────────
  // CHAT — SSE stream
  // ──────────────────────────────────────────────

  @SkipThrottle()
  @Post('send')
  async send(@Req() req: any, @Res() res: Response, @Body() dto: SendMessageDto) {
    const userId = req.user.userId;

    // Derive roles from user profile — explicit keys only, ignores Mongoose _id on subdoc
    const userRole = req.user.role ?? {};
    const roles: string[] = [];
    if (userRole.dev) roles.push('dev');
    if (userRole.cs) roles.push('cs');
    this.logger.log(`User ${userId} roles: [${roles.join(', ')}]`);

    // Find existing session or create a fresh one
    const session = await this.chatService.findOrCreateSession(dto.session_id, userId);
    const sessionId = (session as any)._id.toString();

    // Persist the user message before streaming starts
    await this.chatService.appendMessage(sessionId, 'user', dto.message);

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // First event: tell the frontend which session this belongs to
    res.write(`data: ${JSON.stringify({ type: 'session', session_id: sessionId })}\n\n`);

    // Build history from DB (last 10 exchanges before the current message)
    const history = session.messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Load current session state (agent scratchpad) to pass to orchestra
    const currentState = await this.chatService.getState(sessionId);

    try {
      const response = await fetch(`${this.orchestraUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: dto.message,
          history,
          state: currentState,
          ...(dto.model ? { model: dto.model } : {}),
          roles,
        }),
        signal: AbortSignal.timeout(300_000),
      });

      if (!response.ok || !response.body) {
        res.write(
          `data: ${JSON.stringify({ type: 'error', content: 'LLM service error' })}\n\n`,
        );
        res.end();
        return;
      }

      let fullAnswer = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Intercept state_update events — persist to DB, do NOT forward to frontend
        const lines = chunk.split('\n');
        const forwardLines: string[] = [];

        for (const line of lines) {
          if (!line.startsWith('data: ')) {
            forwardLines.push(line);
            continue;
          }
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === 'state_update' && ev.state) {
              // Persist state updates to MongoDB without forwarding to the browser
              this.chatService.updateState(sessionId, ev.state).catch((err) =>
                this.logger.warn(`State update failed: ${err.message}`),
              );
            } else {
              forwardLines.push(line);
              if (ev.type === 'token') fullAnswer += ev.content;
            }
          } catch {
            forwardLines.push(line);
          }
        }

        const forwardChunk = forwardLines.join('\n');
        if (forwardChunk.trim()) res.write(forwardChunk);
      }

      // Persist assistant response and set session title from first message
      if (fullAnswer) {
        await this.chatService.appendMessage(sessionId, 'assistant', fullAnswer);
        await this.chatService.setTitleFromFirstMessage(sessionId, dto.message);
      }

      res.end();
    } catch (err) {
      this.logger.error(`Chat stream failed: ${(err as Error).message}`);
      res.write(
        `data: ${JSON.stringify({ type: 'error', content: 'Failed to connect to LLM' })}\n\n`,
      );
      res.end();
    }
  }
}
