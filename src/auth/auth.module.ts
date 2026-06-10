import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from './schemas/user.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('SESSION_SECRET'),
        // The JWT is deliberately long-lived (default 30d) so it is NOT the
        // limiting factor for session length.  The real session TTL is enforced
        // by the DB `Session.expiresAt`, which slides forward on every
        // authenticated request (see TokenAuthGuard) — so an actively-used
        // session never expires, while an idle one is reaped by the Mongo TTL
        // index.  Previously this was '1d', which made /auth/me (Passport JWT,
        // ignoreExpiration:false) hard-fail exactly 24h after login regardless
        // of activity → forced daily re-login.  Override via JWT_EXPIRES_IN.
        // Cast to the `ms`-style duration template type @nestjs/jwt expects
        // (e.g. "30d", "12h") — the value is admin-controlled config.
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ||
            '30d') as `${number}d`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
})
export class AuthModule {}
