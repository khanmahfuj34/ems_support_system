import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard.js';
import { UserRoleId } from '../decorators/roles.decorator.js';

// Stand-in for the Prisma service; the guard must re-read the account from
// the database instead of trusting token claims.
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}));

vi.mock('../../database/prisma/prisma.service.js', () => ({
  PrismaService: class {},
}));

function createContext(options: {
  requiredRoles?: UserRoleId[];
  user?: { id?: string; roleId?: number } | null;
}) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockImplementation(
    vi.fn().mockReturnValue(options.requiredRoles ?? undefined) as never,
  );

  const request = { user: options.user };

  const httpContext = {
    getRequest: () => request,
  };

  return {
    context: {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => httpContext,
    } as unknown as ExecutionContext,
    reflector,
    request,
  };
}

function userRow(roleId: number, isActive = true) {
  return Promise.resolve({ roleId, isActive });
}

function createGuard(reflector: Reflector) {
  return new RolesGuard(reflector, prismaMock as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RolesGuard', () => {
  it('allows routes without role metadata', async () => {
    const { context, reflector } = createContext({});
    await expect(createGuard(reflector).canActivate(context)).resolves.toBe(true);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests when roles are required', async () => {
    const { context, reflector } = createContext({
      requiredRoles: [UserRoleId.ADMIN],
      user: undefined,
    });

    await expect(createGuard(reflector).canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects users whose account reverted to a non-authorized role in the database', async () => {
    prismaMock.user.findUnique.mockImplementation(() => userRow(UserRoleId.USER, true));

    const { context, reflector } = createContext({
      requiredRoles: [UserRoleId.ADMIN],
      user: { id: '101', roleId: UserRoleId.ADMIN },
    });

    await expect(createGuard(reflector).canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('grants admins when the database role matches', async () => {
    prismaMock.user.findUnique.mockImplementation(() => userRow(UserRoleId.ADMIN, true));

    const { context, reflector } = createContext({
      requiredRoles: [UserRoleId.ADMIN],
      user: { id: '202', roleId: UserRoleId.ADMIN },
    });

    await expect(createGuard(reflector).canActivate(context)).resolves.toBe(true);
  });

  it('rejects deactivated accounts regardless of role', async () => {
    prismaMock.user.findUnique.mockImplementation(() => userRow(UserRoleId.ADMIN, false));

    const { context, reflector } = createContext({
      requiredRoles: [UserRoleId.ADMIN],
      user: { id: '202', roleId: UserRoleId.ADMIN },
    });

    await expect(createGuard(reflector).canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects missing user id payloads', async () => {
    const { context, reflector } = createContext({
      requiredRoles: [UserRoleId.ADMIN],
      user: { roleId: UserRoleId.ADMIN },
    });

    await expect(createGuard(reflector).canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows any of several declared roles (user route)', async () => {
    prismaMock.user.findUnique.mockImplementation(() => userRow(UserRoleId.USER, true));

    const { context, reflector } = createContext({
      requiredRoles: [UserRoleId.USER, UserRoleId.ADMIN],
      user: { id: '101', roleId: UserRoleId.USER },
    });

    await expect(createGuard(reflector).canActivate(context)).resolves.toBe(true);
  });
});
