import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Session, SessionSchema } from '../auth/schemas/session.schema';
import { AuthModule } from '../auth/auth.module';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { PreventSelfUpdateGuard } from './guards/prevent-self-update.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, TokenAuthGuard, AdminGuard, PreventSelfUpdateGuard],
})
export class UsersModule {}
