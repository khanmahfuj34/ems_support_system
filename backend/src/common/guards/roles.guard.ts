import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  ROLES_KEY,
  UserRoleId,
} from '../decorators/roles.decorator.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roleId: number;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Resolve role requirements, allowing method-level metadata to override class-level metadata.
    const requiredRoles = this.reflector.getAllAndOverride<UserRoleId[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Allow routes without role metadata; authentication must still be enforced separately.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const authenticatedUser = request.user;

    // Reject requests that have not been authenticated.
    if (
      !authenticatedUser ||
      typeof authenticatedUser.id !== 'string' ||
      !/^\d+$/.test(authenticatedUser.id)
    ) {
      throw new UnauthorizedException('Authentication is required');
    }

    // Fetch the current account state and role instead of trusting token claims.
    const user = await this.prisma.user.findUnique({
      where: {
        id: BigInt(authenticatedUser.id),
      },
      select: {
        roleId: true,
        isActive: true,
      },
    });

    // The account may have been deleted or deactivated after token issuance.
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is unavailable');
    }

    // Require at least one of the roles declared for this endpoint.
    if (!requiredRoles.includes(user.roleId as UserRoleId)) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}