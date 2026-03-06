import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User information not found');
    }

    // Check if user is admin (admin = true)
    if (user.admin !== true) {
      throw new ForbiddenException(
        'Only administrators can perform this action',
      );
    }

    return true;
  }
}
