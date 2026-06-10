import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Session, SessionDocument } from '../../auth/schemas/session.schema';
import { User, UserDocument } from '../../auth/schemas/user.schema';
import { DEFAULT_SESSION_TTL_DAYS } from '../../auth/auth.service';

@Injectable()
export class TokenAuthGuard implements CanActivate {
  private readonly sessionTtlMs: number;

  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {
    const rawDays = Number(this.configService.get<string>('SESSION_TTL_DAYS'));
    const days =
      Number.isFinite(rawDays) && rawDays > 0 ? rawDays : DEFAULT_SESSION_TTL_DAYS;
    this.sessionTtlMs = days * 24 * 60 * 60 * 1000;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['access-token'];

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    const session = await this.sessionModel.findOne({ token }).exec();

    if (!session) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Check if token has expired
    if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
      throw new UnauthorizedException('Token has expired');
    }

    // Fetch user data to get permissions
    const user = await this.userModel.findById(session.userId).exec();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // ── Sliding expiration ──────────────────────────────────────────────────
    // Push the session's expiry forward on every authenticated request so an
    // actively-used session never expires.  Only the idle timeout (no requests
    // for SESSION_TTL_DAYS) reaps the session via the Mongo TTL index.  We skip
    // the write when the new expiry is within ~1 hour of the current one to
    // avoid a DB write on every single request (would be wasteful on hot paths).
    const newExpiry = new Date(Date.now() + this.sessionTtlMs);
    const currentExpiry = session.expiresAt ? new Date(session.expiresAt) : new Date(0);
    if (newExpiry.getTime() - currentExpiry.getTime() > 60 * 60 * 1000) {
      // Fire-and-forget — don't block the request on the slide write.
      this.sessionModel
        .updateOne({ token }, { $set: { expiresAt: newExpiry } })
        .exec()
        .catch(() => {
          /* non-fatal — the session is still valid for this request */
        });
    }

    // Attach user info to request for use in guards and controllers
    request.user = {
      userId: session.userId,
      token: session.token,
      email: user.email,
      name: user.name,
      role: user.role,
      admin: user.admin,
      write: user.write,
    };

    return true;
  }
}
