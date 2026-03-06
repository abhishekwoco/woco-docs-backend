import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from '../../auth/schemas/session.schema';
import { User, UserDocument } from '../../auth/schemas/user.schema';

@Injectable()
export class TokenAuthGuard implements CanActivate {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

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
