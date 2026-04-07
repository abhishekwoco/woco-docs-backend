import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatSession, ChatSessionDocument } from './schemas/chat-session.schema';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatSession.name)
    private readonly sessionModel: Model<ChatSessionDocument>,
  ) {}

  async createSession(userId: string): Promise<ChatSessionDocument> {
    const session = new this.sessionModel({ userId, title: 'New Chat', messages: [] });
    return session.save();
  }

  async getUserSessions(userId: string) {
    return this.sessionModel
      .find({ userId, isActive: true })
      .select('_id title createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean()
      .exec();
  }

  async getSessionById(sessionId: string, userId: string): Promise<ChatSessionDocument> {
    const session = await this.sessionModel
      .findOne({ _id: sessionId, userId, isActive: true })
      .exec();
    if (!session) throw new NotFoundException('Chat session not found');
    return session;
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const result = await this.sessionModel
      .findOneAndUpdate({ _id: sessionId, userId }, { isActive: false })
      .exec();
    if (!result) throw new NotFoundException('Chat session not found');
  }

  async findOrCreateSession(
    sessionId: string | undefined,
    userId: string,
  ): Promise<ChatSessionDocument> {
    if (!sessionId) return this.createSession(userId);

    const session = await this.sessionModel
      .findOne({ _id: sessionId, userId, isActive: true })
      .exec();
    if (!session) throw new NotFoundException('Chat session not found');
    return session;
  }

  async appendMessage(sessionId: string, role: string, content: string): Promise<void> {
    await this.sessionModel
      .findByIdAndUpdate(sessionId, {
        $push: { messages: { role, content, timestamp: new Date() } },
      })
      .exec();
  }

  /**
   * Sets the session title from the first user message,
   * but only if the title is still the default "New Chat".
   */
  async setTitleFromFirstMessage(sessionId: string, firstMessage: string): Promise<void> {
    const session = await this.sessionModel
      .findById(sessionId)
      .select('title')
      .lean()
      .exec();

    if (session?.title === 'New Chat') {
      const title =
        firstMessage.length > 50
          ? firstMessage.substring(0, 50) + '...'
          : firstMessage;
      await this.sessionModel.findByIdAndUpdate(sessionId, { title }).exec();
    }
  }
}
