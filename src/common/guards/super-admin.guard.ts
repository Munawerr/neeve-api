import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    const roleSlug =
      typeof user?.role === 'string' ? user.role : user?.role?.slug;
    const isSuperAdmin = roleSlug === 'super-admin' || roleSlug === 'admin';

    if (!isSuperAdmin) {
      throw new ForbiddenException('Only super admin can access archive resources');
    }

    return true;
  }
}
