import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class PreventSelfUpdateGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;

    if (!user) {
      throw new ForbiddenException('User information not found');
    }

    // Check if user is trying to update their own profile
    const targetUserId = body.user_id;
    const currentUserId = user.userId.toString();

    if (targetUserId === currentUserId) {
      throw new ForbiddenException('You cannot update your own profile');
    }

    return true;
  }
}
