import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Session, SessionDocument } from './schemas/session.schema';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private jwtService: JwtService,
  ) {}

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

    const payload = { sub: user._id, email: user.email, name: user.name, role: user.role, admin: user.admin };
    const accessToken = this.jwtService.sign(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

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
      },
    };
  }

  async me(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('email name role admin')
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
