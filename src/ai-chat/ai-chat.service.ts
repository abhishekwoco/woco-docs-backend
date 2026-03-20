import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import {
  ChatSession,
  ChatSessionDocument,
} from './schemas/chat-session.schema';
import { Document, DocumentDocument } from '../documents/schemas/document.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private readonly orchestraUrl: string;

  constructor(
    @InjectModel(ChatSession.name) private chatSessionModel: Model<ChatSessionDocument>,
    @InjectModel(Document.name) private documentModel: Model<DocumentDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    private configService: ConfigService,
  ) {
    this.orchestraUrl = this.configService.get<string>('ORCHESTRA_URL') || 'http://localhost:8001';
  }

  // ──────────────────────────────────────────────
  // PERSONA RESOLUTION
  // ──────────────────────────────────────────────

  /**
   * Resolves the user's allowed persona from their role.
   * If user has both cs and dev, defaults to 'cs'.
   * Throws ForbiddenException if user has no persona assigned.
   */
  private resolvePersona(userRole: AuthenticatedUser['role']): string {
    if (userRole.cs) return 'cs';
    if (userRole.dev) return 'dev';
    throw new ForbiddenException('User has no persona assigned for AI chat access');
  }

  /**
   * Returns all personas the user has access to.
   */
  private getAllowedPersonas(userRole: AuthenticatedUser['role']): string[] {
    const personas: string[] = [];
    if (userRole.cs) personas.push('cs');
    if (userRole.dev) personas.push('dev');
    return personas;
  }

  // ──────────────────────────────────────────────
  // HEALTH CHECK
  // ──────────────────────────────────────────────

  async getHealth() {
    try {
      this.logger.log('Checking Orchestra health');
      const response = await fetch(`${this.orchestraUrl}/health`, {
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return { status: 'degraded', nestjs: 'ok', orchestra: 'unavailable' };
      }

      const orchestraHealth = await response.json();
      return {
        status: orchestraHealth.status === 'ok' ? 'ok' : 'degraded',
        nestjs: 'ok',
        orchestra: orchestraHealth,
      };
    } catch (err) {
      this.logger.warn(`Orchestra health check failed: ${(err as Error).message}`);
      return { status: 'degraded', nestjs: 'ok', orchestra: 'unavailable' };
    }
  }

  // ──────────────────────────────────────────────
  // CHAT SESSION MANAGEMENT
  // ──────────────────────────────────────────────

  async createSession(user: AuthenticatedUser, title?: string): Promise<ChatSession> {
    const persona = this.resolvePersona(user.role);
    const session = new this.chatSessionModel({
      userId: user.userId,
      persona,
      title: title || 'New Chat',
      messages: [],
    });
    return session.save();
  }

  async getUserSessions(user: AuthenticatedUser, pagination?: { page: number; limit: number }) {
    const allowedPersonas = this.getAllowedPersonas(user.role);
    const filter = { userId: user.userId, isActive: true, persona: { $in: allowedPersonas } };

    const query = this.chatSessionModel
      .find(filter)
      .select('_id title persona createdAt updatedAt')
      .sort({ updatedAt: -1 });

    if (!pagination) {
      return query.exec();
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      query.skip(skip).limit(limit).exec(),
      this.chatSessionModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSessionById(sessionId: string, userId: string): Promise<ChatSession> {
    const session = await this.chatSessionModel
      .findOne({ _id: sessionId, userId })
      .exec();

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return session;
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.chatSessionModel
      .findOneAndUpdate(
        { _id: sessionId, userId },
        { isActive: false },
        { new: true },
      )
      .exec();

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }
  }

  // ──────────────────────────────────────────────
  // CHAT MESSAGING — proxy to Python Orchestra
  // ──────────────────────────────────────────────

  private async getOrCreateSession(sessionId: string | undefined, user: AuthenticatedUser) {
    if (sessionId) {
      const session = await this.chatSessionModel
        .findOne({ _id: sessionId, userId: user.userId, isActive: true })
        .exec();

      if (!session) {
        throw new NotFoundException('Chat session not found');
      }
      return session;
    }

    const persona = this.resolvePersona(user.role);
    const session = new this.chatSessionModel({
      userId: user.userId,
      persona,
      title: 'New Chat',
      messages: [],
    });
    return session.save();
  }

  async sendMessage(sessionId: string | undefined, user: AuthenticatedUser, message: string, res: Response, clientSchema?: string) {
    this.logger.log(`sendMessage user=${user.userId} session=${sessionId || 'new'}`);
    const session = await this.getOrCreateSession(sessionId, user);

    session.messages.push({
      role: 'user',
      content: message,
      sources: [],
      timestamp: new Date(),
    });
    await session.save();

    const sessionIdResolved = (session as any)._id.toString();

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send session_id as the first event
    res.write(`data: ${JSON.stringify({ type: 'session', session_id: sessionIdResolved })}\n\n`);

    try {
      const response = await fetch(`${this.orchestraUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdResolved,
          message,
          persona: session.persona,
          user_roles: this.getAllowedPersonas(user.role),
          history: session.messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          ...(clientSchema ? { client_schema: clientSchema } : {}),
        }),
        signal: AbortSignal.timeout(300_000), // 5min for LLM streaming
      });

      if (!response.ok || !response.body) {
        res.write(`data: ${JSON.stringify({ type: 'error', content: 'Orchestra gateway error' })}\n\n`);
        res.end();
        return;
      }

      let fullAnswer = '';
      let sources: any[] = [];
      let streamError = false;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          res.write(text);

          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'token') {
                  fullAnswer += data.content;
                } else if (data.type === 'sources') {
                  sources = data.sources || [];
                }
              } catch {
                // skip malformed lines
              }
            }
          }
        }
      } catch (streamErr) {
        streamError = true;
        this.logger.warn(`Stream interrupted for session=${sessionIdResolved}: ${(streamErr as Error).message}`);
        res.write(`data: ${JSON.stringify({ type: 'error', content: 'Stream interrupted — partial response saved' })}\n\n`);
      }

      // Always persist the assistant response, even if partial
      if (fullAnswer.length > 0) {
        session.messages.push({
          role: 'assistant',
          content: fullAnswer + (streamError ? '\n\n*(Response was interrupted)*' : ''),
          sources,
          timestamp: new Date(),
        });

        if (session.messages.length === 2 && session.title === 'New Chat') {
          session.title = message.substring(0, 60) + (message.length > 60 ? '...' : '');
        }

        await session.save();
      }

      res.end();
    } catch (err) {
      this.logger.error(`sendMessage failed for session=${sessionIdResolved}: ${(err as Error).message}`);
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to connect to Orchestra gateway' })}\n\n`);
      res.end();
    }
  }

  // ──────────────────────────────────────────────
  // DOCUMENT FEED — for Python Orchestra
  // ──────────────────────────────────────────────

  async getDocumentsForIngestion(persona?: string) {
    const categoryFilter: any = { isActive: true };
    if (persona) categoryFilter.persona = persona;

    const categories = await this.categoryModel.find(categoryFilter).exec();
    const categoryIds = categories.map((c: any) => c._id);
    const categoryMap = new Map(
      categories.map((c: any) => [c._id.toString(), c]),
    );

    const documents = await this.documentModel
      .find({
        isPublished: true,
        categoryId: { $in: categoryIds },
      })
      .exec();

    return documents.map((doc: any) => {
      const category = categoryMap.get(doc.categoryId?.toString());
      return {
        id: doc._id.toString(),
        title: doc.title,
        slug: doc.slug,
        content: doc.content,
        description: doc.description,
        tags: doc.tags,
        category: category
          ? {
              id: category._id.toString(),
              name: category.name,
              slug: category.slug,
              persona: category.persona,
            }
          : null,
        updatedAt: doc.updatedAt,
      };
    });
  }

  // ──────────────────────────────────────────────
  // INGESTION MANAGEMENT
  // ──────────────────────────────────────────────

  async getIngestionStatus(token?: string) {
    try {
      const response = await fetch(`${this.orchestraUrl}/api/ingestion/status`, {
        headers: { ...(token ? { 'access-token': token } : {}) },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return { status: 'unavailable', message: 'Orchestra gateway not reachable' };
      }

      return await response.json();
    } catch {
      return { status: 'unavailable', message: 'Orchestra gateway not reachable' };
    }
  }

  async triggerIngestion(persona?: string, token?: string) {
    this.logger.log(`triggerIngestion persona=${persona || 'all'}`);
    try {
      const response = await fetch(`${this.orchestraUrl}/api/ingestion/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'access-token': token } : {}),
        },
        body: JSON.stringify({ persona, token }),
        signal: AbortSignal.timeout(600_000), // 10min for bulk ingestion (one-by-one embedding is slow)
      });

      if (!response.ok) {
        throw new HttpException('Failed to trigger ingestion', HttpStatus.BAD_GATEWAY);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Orchestra gateway not reachable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async ingestDocumentById(documentId: string, token?: string) {
    this.logger.log(`ingestDocumentById id=${documentId}`);
    const doc: any = await this.documentModel.findById(documentId).exec();

    if (!doc) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    let category: any = null;
    if (doc.categoryId) {
      const cat: any = await this.categoryModel.findById(doc.categoryId).exec();
      if (cat) {
        category = {
          id: cat._id.toString(),
          name: cat.name,
          slug: cat.slug,
          persona: cat.persona,
        };
      }
    }

    try {
      const response = await fetch(`${this.orchestraUrl}/api/ingestion/document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'access-token': token } : {}),
        },
        body: JSON.stringify({
          id: doc._id.toString(),
          title: doc.title,
          slug: doc.slug,
          content: doc.content,
          description: doc.description,
          tags: doc.tags,
          category,
          updatedAt: doc.updatedAt,
        }),
        signal: AbortSignal.timeout(180_000), // 3min for single doc (embedding model may cold start)
      });

      if (!response.ok) {
        throw new HttpException('Failed to ingest document in Orchestra', HttpStatus.BAD_GATEWAY);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Orchestra gateway not reachable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // ──────────────────────────────────────────────
  // SCHEMA REFERENCE — proxy to Orchestra
  // ──────────────────────────────────────────────

  async updateSchemaReference() {
    this.logger.log('Updating schema reference from live database');
    try {
      const response = await fetch(`${this.orchestraUrl}/api/ingestion/schema-reference`, {
        method: 'POST',
        signal: AbortSignal.timeout(120_000), // 2min — introspects all tables
      });

      if (!response.ok) {
        throw new HttpException('Failed to update schema reference', HttpStatus.BAD_GATEWAY);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Orchestra gateway not reachable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // ──────────────────────────────────────────────
  // DATABASE QUERY TOOL — proxy to Orchestra
  // ──────────────────────────────────────────────

  async getDbClients(token?: string) {
    try {
      const response = await fetch(`${this.orchestraUrl}/api/db/clients`, {
        headers: { ...(token ? { 'access-token': token } : {}) },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new HttpException('Failed to fetch clients', HttpStatus.BAD_GATEWAY);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Orchestra gateway not reachable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
