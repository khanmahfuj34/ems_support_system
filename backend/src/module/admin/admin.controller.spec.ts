import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ROLES_KEY, UserRoleId } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AdminController } from './admin.controller.js';

const userSearchMock = vi.hoisted(() => ({
  searchUsers: vi.fn(),
  getProfile: vi.fn(),
  listTickets: vi.fn(),
}));

function createController() {
  return new AdminController({} as never, userSearchMock as never);
}

const request = {
  user: { id: '202', email: 'admin@example.test', roleId: UserRoleId.ADMIN },
} as never;

describe('AdminController user search routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('protects the routes with JWT authentication and admin authorization', () => {
    expect(Reflect.getMetadata('__guards__', AdminController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, AdminController)).toEqual([
      UserRoleId.ADMIN,
    ]);
    expect(Reflect.getMetadata('path', AdminController)).toBe('api/v1/admin');
  });

  it('routes user search, profile, and ticket history to the existing service', async () => {
    const controller = createController();
    const searchQuery = { search: 'gmai', limit: 10 };
    const ticketsQuery = { limit: 10, sortOrder: 'desc' as const };
    userSearchMock.searchUsers.mockResolvedValue({ message: 'Users retrieved' });
    userSearchMock.getProfile.mockResolvedValue({ message: 'User retrieved' });
    userSearchMock.listTickets.mockResolvedValue({
      message: 'User tickets retrieved',
    });

    await controller.searchUsers(request, searchQuery);
    await controller.getUserProfile('7', request);
    await controller.listUserTickets('7', request, ticketsQuery);

    expect(userSearchMock.searchUsers).toHaveBeenCalledWith(
      request.user,
      searchQuery,
    );
    expect(userSearchMock.getProfile).toHaveBeenCalledWith(request.user, '7');
    expect(userSearchMock.listTickets).toHaveBeenCalledWith(
      request.user,
      '7',
      ticketsQuery,
    );
  });

  it('maps the collection and detail methods to the expected GET routes', () => {
    expect(Reflect.getMetadata('path', AdminController.prototype.searchUsers)).toBe(
      'users',
    );
    expect(Reflect.getMetadata('path', AdminController.prototype.getUserProfile)).toBe(
      'users/:id',
    );
    expect(Reflect.getMetadata('path', AdminController.prototype.listUserTickets)).toBe(
      'users/:id/tickets',
    );
    expect(Reflect.getMetadata('method', AdminController.prototype.searchUsers)).toBe(
      0,
    );
    expect(Reflect.getMetadata('method', AdminController.prototype.getUserProfile)).toBe(
      0,
    );
    expect(Reflect.getMetadata('method', AdminController.prototype.listUserTickets)).toBe(
      0,
    );
  });
});
