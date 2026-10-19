import { ConflictException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service.js';
import { UserRoleId } from '../../common/decorators/roles.decorator.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

const prismaMock = vi.hoisted(() => ({
  userRole: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const jwtMock = vi.hoisted(() => ({
  signAsync: vi.fn(),
}));

vi.mock('../../database/prisma/prisma.service.js', () => ({
  PrismaService: class {},
}));

vi.mock('@nestjs/jwt', () => ({
  JwtService: class {},
}));

vi.mock('bcrypt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bcrypt')>();
  return {
    ...actual,
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn().mockResolvedValue(true),
  };
});

function createService() {
  return new AuthService(prismaMock as never, jwtMock as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  jwtMock.signAsync.mockResolvedValue('signed-token');
});

describe('AuthService.register', () => {
  const dto: RegisterDto = {
    name: 'Regular User',
    email: 'user@example.com',
    password: 'sup3rsecret',
  };

  function userRow(roleId: number) {
    return { id: BigInt(501), name: dto.name, email: dto.email, roleId };
  }

  it('always creates a USER account, ignoring any client-suggested role', async () => {
    // The USER role is resolved from the seeded lookup table.
    prismaMock.userRole.findUnique.mockResolvedValue({
      id: UserRoleId.USER,
      name: 'USER',
    });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(userRow(UserRoleId.USER));

    const service = createService();
    // Include a role override attempt in the credential object; the service
    // must never honor it (ValidationPipe strips it; the service hardcodes USER).
    const hostileDto = { ...dto, roleId: UserRoleId.ADMIN } as unknown as RegisterDto;

    const result = await service.register(hostileDto);

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roleId: UserRoleId.USER }),
      }),
    );
    expect(result.user).toMatchObject({
      roleId: UserRoleId.USER,
      email: 'user@example.com',
    });
  });

  it('fails closed when the USER role lookup is misconfigured', async () => {
    prismaMock.userRole.findUnique.mockResolvedValue({ id: 1, name: 'ADMIN' });

    const service = createService();

    await expect(service.register(dto)).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate emails with 409', async () => {
    prismaMock.userRole.findUnique.mockResolvedValue({
      id: UserRoleId.USER,
      name: 'USER',
    });
    prismaMock.user.findUnique.mockResolvedValue({ id: BigInt(101) });

    const service = createService();

    await expect(service.register(dto)).rejects.toThrow(ConflictException);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  const dto: LoginDto = {
    email: 'admin@example.com',
    password: 'sup3rsecret',
  };

  function dbUser(overrides: Partial<{
    id: bigint;
    email: string;
    password: string;
    roleId: number;
    isActive: boolean;
  }> = {}) {
    return {
      id: BigInt(202),
      email: dto.email,
      password: 'hashed-password',
      roleId: UserRoleId.ADMIN,
      isActive: true,
      ...overrides,
    };
  }

  it('signs the token with the role stored in the database', async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser());

    const service = createService();
    const result = await service.login(dto);

    expect(jwtMock.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: '202',
        roleId: UserRoleId.ADMIN,
      }),
    );
    expect(result.user.roleId).toBe(UserRoleId.ADMIN);
  });

  it('rejects invalid credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const service = createService();

    await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects inactive accounts', async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser({ isActive: false }));

    const service = createService();

    await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    expect(jwtMock.signAsync).not.toHaveBeenCalled();
  });
});
