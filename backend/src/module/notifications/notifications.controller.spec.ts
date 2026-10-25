import { NotificationsController } from './notifications.controller.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

const notificationsMock = vi.hoisted(() => ({
  listForUser: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}));

function createController() {
  return new NotificationsController(
    notificationsMock as never,
  );
}

const request = {
  user: { id: '7', email: 'user@example.com', roleId: 1 },
} as never;

describe('NotificationsController', () => {
  it('requires JWT authentication for every route', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      NotificationsController,
    );

    expect(guards).toEqual([JwtAuthGuard]);

    expect(
      Reflect.getMetadata('path', NotificationsController),
    ).toBe('api/v1/notifications');
  });

  it('maps list to GET and delegates the authenticated user ID', async () => {
    expect(
      Reflect.getMetadata('path', NotificationsController.prototype.list),
    ).toBe('/');

    expect(
      Reflect.getMetadata('method', NotificationsController.prototype.list),
    ).toBe(0);

    const controller = createController();

    notificationsMock.listForUser.mockResolvedValue({ message: 'ok' });

    const query = { page: 2, limit: 10, unreadOnly: true };
    const result = await controller.list(
      request,
      query as never,
    );

    expect(result).toEqual({ message: 'ok' });
    expect(notificationsMock.listForUser).toHaveBeenCalledWith(
      '7',
      query,
    );
  });

  it('maps read-all before :id/read and delegates both to the service', async () => {
    expect(
      Reflect.getMetadata(
        'path',
        NotificationsController.prototype.markAllAsRead,
      ),
    ).toBe('read-all');

    expect(
      Reflect.getMetadata(
        'path',
        NotificationsController.prototype.markAsRead,
      ),
    ).toBe(':id/read');

    const controller = createController();

    notificationsMock.markAllAsRead.mockResolvedValue({
      message: 'Unread notifications marked as read',
      updatedCount: 2,
    });
    notificationsMock.markAsRead.mockResolvedValue({ message: 'ok' });

    await expect(controller.markAllAsRead(request)).resolves.toEqual({
      message: 'Unread notifications marked as read',
      updatedCount: 2,
    });
    expect(notificationsMock.markAllAsRead).toHaveBeenCalledWith('7');

    await controller.markAsRead('3', request);
    expect(notificationsMock.markAsRead).toHaveBeenCalledWith('7', '3');
  });
});
