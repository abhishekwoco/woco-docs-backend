import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class WritePermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User information not found');
    }

    // Check if user has write permissions (dev or cs)
    const hasWritePermission =
      user.write?.dev === true || user.write?.cs === true;

    if (!hasWritePermission) {
      throw new ForbiddenException(
        'You do not have write permissions to perform this action',
      );
    }

    return true;
  }
}
