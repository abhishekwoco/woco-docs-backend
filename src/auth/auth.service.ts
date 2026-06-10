import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Session, SessionDocument } from './schemas/session.schema';
import { LoginDto } from './dto/login.dto';

// Default session lifetime in days.  The session slides forward by this much
// on every authenticated request (see TokenAuthGuard), so this is really the
// "idle timeout" — an actively used session never expires.  Override via the
// SESSION_TTL_DAYS env var.  MUST stay shorter than JWT_EXPIRES_IN (default
// 30d) so the DB session — not the JWT — is the real source of truth.
export const DEFAULT_SESSION_TTL_DAYS = 7;

@Injectable()
export class AuthService {
  private readonly sessionTtlDays: number;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const raw = Number(this.configService.get<string>('SESSION_TTL_DAYS'));
    this.sessionTtlDays =
      Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SESSION_TTL_DAYS;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user._id, email: user.email, name: user.name, role: user.role, admin: user.admin, write: user.write };
    const accessToken = this.jwtService.sign(payload);

    // Initial session window — slides forward on each request via TokenAuthGuard.
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.sessionTtlDays);

    await this.sessionModel.create({
      userId: user._id,
      token: accessToken,
      expiresAt,
    });

    return {
      access_token: accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        admin: user.admin,
        write: user.write,
      },
    };
  }

  async me(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('email name role admin write')
      .lean();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async logout(token: string) {
    await this.sessionModel.deleteOne({ token });
    return { message: 'Logged out successfully' };
  }
}
