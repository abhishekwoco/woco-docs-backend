import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatSession, ChatSessionDocument } from './schemas/chat-session.schema';
import { ChatFeedback, ChatFeedbackDocument } from './schemas/chat-feedback.schema';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatSession.name)
    private readonly sessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatFeedback.name)
    private readonly feedbackModel: Model<ChatFeedbackDocument>,
  ) {}

  // ── Answer feedback ───────────────────────────────────────────────────────

  /** Record a 👍/👎 vote on an assistant answer (question+answer snapshotted). */
  async saveFeedback(
    userId: string,
    body: {
      session_id?: string;
      rating: 'up' | 'down';
      question: string;
      answer: string;
      comment?: string;
    },
  ): Promise<{ id: string }> {
    const doc = await this.feedbackModel.create({
      userId,
      sessionId: body.session_id || undefined,
      rating: body.rating,
      question: (body.question || '').slice(0, 2000),
      answer: (body.answer || '').slice(0, 8000),
      comment: (body.comment || '').slice(0, 1000),
    });
    return { id: (doc as any)._id.toString() };
  }

  /** Admin review feed — newest first, optional rating filter. */
  async listFeedback(rating?: 'up' | 'down', limit = 50) {
    const q: Record<string, unknown> = {};
    if (rating) q.rating = rating;
    const items = await this.feedbackModel
      .find(q)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean()
      .exec();
    const [up, down] = await Promise.all([
      this.feedbackModel.countDocuments({ rating: 'up' }),
      this.feedbackModel.countDocuments({ rating: 'down' }),
    ]);
    return { items, counts: { up, down } };
  }

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

  /**
   * Return the full message list for a session (for compression).
   * Verifies ownership.
   */
  async getMessagesForCompression(
    sessionId: string,
    userId: string,
  ): Promise<{ role: string; content: string }[]> {
    const session = await this.getSessionById(sessionId, userId);
    return session.messages.map((m) => ({ role: m.role, content: m.content }));
  }

  /**
   * Replace a session's entire message list (used after a compression event,
   * which rewrites the history to [summary, ...recent turns]).  Verifies
   * ownership.
   */
  async replaceMessages(
    sessionId: string,
    userId: string,
    messages: { role: string; content: string }[],
  ): Promise<void> {
    const stamped = messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: new Date(),
    }));
    const result = await this.sessionModel
      .findOneAndUpdate(
        { _id: sessionId, userId, isActive: true },
        { $set: { messages: stamped } },
      )
      .exec();
    if (!result) throw new NotFoundException('Chat session not found');
  }

  /**
   * Return the agent scratchpad state for a session.
   * Returns {} if the session has no state yet.
   */
  async getState(sessionId: string): Promise<Record<string, any>> {
    const session = await this.sessionModel
      .findById(sessionId)
      .select('state')
      .lean()
      .exec();
    return (session as any)?.state ?? {};
  }

  /**
   * Deep-merge incoming state fields into the existing session state.
   * Only the keys present in `updates` are changed — others are preserved.
   */
  async updateState(sessionId: string, updates: Record<string, any>): Promise<void> {
    if (!updates || Object.keys(updates).length === 0) return;

    // Build $set payload with dot-notation keys to avoid overwriting the whole state
    const setPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      setPayload[`state.${key}`] = value;
    }

    await this.sessionModel
      .findByIdAndUpdate(sessionId, { $set: setPayload })
      .exec();
  }
}
