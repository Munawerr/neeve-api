import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import * as env from 'dotenv';
env.config();

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    if (!requiredPermissions) {
      return super.canActivate(context);
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request?.headers?.authorization;
    if (!authHeader) {
      throw new ForbiddenException('Authorization header not found');
    }

    const token = authHeader.split(' ')[1];
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch (err) {
      throw new ForbiddenException('Invalid token');
    }

    const userPermissions = decodedToken.permissions;
    if (
      !userPermissions ||
      !this.hasPermission(userPermissions, requiredPermissions)
    ) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return super.canActivate(context);
  }

  private hasPermission(
    userPermissions: string[],
    requiredPermissions: string[],
  ): boolean {
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}
