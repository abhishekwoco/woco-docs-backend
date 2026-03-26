import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { ChatSession, ChatSessionSchema } from './schemas/chat-session.schema';
import { ChatFeedback, ChatFeedbackSchema } from './schemas/chat-feedback.schema';
import { Document, DocumentSchema } from '../documents/schemas/document.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { AuthModule } from '../auth/auth.module';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatSession.name, schema: ChatSessionSchema },
      { name: ChatFeedback.name, schema: ChatFeedbackSchema },
      { name: Document.name, schema: DocumentSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
    AuthModule,
  ],
  controllers: [AiChatController],
  providers: [AiChatService, TokenAuthGuard],
})
export class AiChatModule {}
