import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { TICKET_STATUS } from '../../common/constants/ticket-status.js';

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  ticket: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  ticketStatusHistory: {
    create: vi.fn(),
  },
  ticketActivityLog: {
    create: vi.fn(),
  },
}));

const notificationsMock = vi.hoisted(() => ({
  createTicketNotification: vi.fn(),
}));

vi.mock('../../database/prisma/prisma.service.js', () => ({
  PrismaService: class {},
}));

function createService() {
  return new AdminService(
    prismaMock as never,
    notificationsMock as never,
  );
}

function setupTicket(
  statusId: number,
  overrides: {
    firstResponseAt?: Date | null;
    resolutionDueAt?: Date | null;
    resolutionSummary?: string | null;
  } = {},
) {
  prismaMock.ticket.findUnique.mockResolvedValue({
    id: 1n,
    ticketNumber: 'EMS-test',
    statusId,
    userId: 20n,
    firstResponseAt: overrides.firstResponseAt ?? null,
    resolutionDueAt: overrides.resolutionDueAt ?? null,
    resolutionSummary: overrides.resolutionSummary ?? null,
  });

  prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.ticketStatusHistory.create.mockResolvedValue({});
  prismaMock.ticketActivityLog.create.mockResolvedValue({});

  prismaMock.$transaction.mockImplementation(
    async (callback) => callback(prismaMock),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminService.updateTicketStatus', () => {
  it('resolves an IN_PROGRESS ticket and records history/activity', async () => {
    setupTicket(TICKET_STATUS.IN_PROGRESS);

    const service = createService();

    const result = await service.updateTicketStatus('1', '10', {
      status: 'RESOLVED',
      resolutionSummary: 'Printer issue fixed',
    });

    expect(result.data.status).toBe('RESOLVED');

    expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1n,
          statusId: TICKET_STATUS.IN_PROGRESS,
        },
        data: expect.objectContaining({
          statusId: TICKET_STATUS.RESOLVED,
          resolutionSummary: 'Printer issue fixed',
          slaStatus: 4,
        }),
      }),
    );

    expect(prismaMock.ticketStatusHistory.create).toHaveBeenCalled();
    expect(prismaMock.ticketActivityLog.create).toHaveBeenCalled();

    expect(
      notificationsMock.createTicketNotification,
    ).toHaveBeenCalledWith(prismaMock, {
      userId: 20n,
      ticketId: 1n,
      title: 'Ticket status updated',
      type: 'TICKET_STATUS_CHANGED',
      message: 'Resolved: Printer issue fixed',
    });
  });

  it('rejects an invalid transition from PENDING_REVIEW to IN_PROGRESS', async () => {
    setupTicket(TICKET_STATUS.PENDING_REVIEW);

    const service = createService();

    await expect(
      service.updateTicketStatus('1', '10', {
        status: 'IN_PROGRESS',
      }),
    ).rejects.toThrow(ConflictException);

    expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.ticketStatusHistory.create).not.toHaveBeenCalled();
    expect(prismaMock.ticketActivityLog.create).not.toHaveBeenCalled();
    expect(
      notificationsMock.createTicketNotification,
    ).not.toHaveBeenCalled();
  });

  it('rejects a concurrent update if the status has changed', async () => {
    setupTicket(TICKET_STATUS.IN_PROGRESS);
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 0 });

    const service = createService();

    await expect(
      service.updateTicketStatus('1', '10', {
        status: 'WAITING_FOR_USER',
        reason: 'Please provide the requested screenshot',
      }),
    ).rejects.toThrow(ConflictException);

    expect(prismaMock.ticketStatusHistory.create).not.toHaveBeenCalled();
    expect(prismaMock.ticketActivityLog.create).not.toHaveBeenCalled();
    expect(
      notificationsMock.createTicketNotification,
    ).not.toHaveBeenCalled();
  });

  it('aborts the lifecycle transaction when the notification write fails', async () => {
    setupTicket(TICKET_STATUS.ACCEPTED);
    notificationsMock.createTicketNotification
      .mockRejectedValueOnce(new Error('Notification write failed'));

    const service = createService();

    await expect(
      service.updateTicketStatus('1', '10', {
        status: 'IN_PROGRESS',
      }),
    ).rejects.toThrow('Notification write failed');
  });

  it('rejects WAITING_FOR_USER without a reason', async () => {
    const service = createService();

    await expect(
      service.updateTicketStatus('1', '10', {
        status: 'WAITING_FOR_USER',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects RESOLVED without a resolution summary', async () => {
    const service = createService();

    await expect(
      service.updateTicketStatus('1', '10', {
        status: 'RESOLVED',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an invalid ticket ID', async () => {
    const service = createService();

    await expect(
      service.updateTicketStatus('0', '10', {
        status: 'IN_PROGRESS',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('throws NotFound when the ticket does not exist', async () => {
    setupTicket(TICKET_STATUS.ACCEPTED);
    prismaMock.ticket.findUnique.mockResolvedValue(null);

    const service = createService();

    await expect(
      service.updateTicketStatus('1', '10', {
        status: 'IN_PROGRESS',
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
    expect(
      notificationsMock.createTicketNotification,
    ).not.toHaveBeenCalled();
  });

  it('reopens a RESOLVED ticket as breached when past the resolution deadline', async () => {
    setupTicket(TICKET_STATUS.RESOLVED, {
      resolutionDueAt: new Date('2020-01-01'),
      resolutionSummary: 'Old summary',
    });

    const service = createService();

    const result = await service.updateTicketStatus('1', '10', {
      status: 'REOPENED',
      reason: 'Issue is not fixed',
    });

    expect(result.data.status).toBe('REOPENED');
    expect(result.data.reason).toBe('Issue is not fixed');

    expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1n,
          statusId: TICKET_STATUS.RESOLVED,
        },
        data: expect.objectContaining({
          statusId: TICKET_STATUS.REOPENED,
          resolutionSummary: null,
          resolvedAt: null,
          closedAt: null,
          slaStatus: 3,
        }),
      }),
    );
  });

  it('reopens a RESOLVED ticket on track when within the resolution deadline', async () => {
    setupTicket(TICKET_STATUS.RESOLVED, {
      resolutionDueAt: new Date(Date.now() + 60_000),
    });

    const service = createService();

    const result = await service.updateTicketStatus('1', '10', {
      status: 'REOPENED',
      reason: 'Issue is not fixed',
    });

    expect(result.data.status).toBe('REOPENED');

    expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1n,
          statusId: TICKET_STATUS.RESOLVED,
        },
        data: expect.objectContaining({
          statusId: TICKET_STATUS.REOPENED,
          slaStatus: 1,
        }),
      }),
    );
  });
});

describe('AdminService.acceptTicket', () => {
  it('accepts a PENDING_REVIEW ticket and records history/activity', async () => {
    setupTicket(TICKET_STATUS.PENDING_REVIEW);

    const service = createService();

    const result = await service.acceptTicket('1', '10');

    expect(result.data).toMatchObject({
      id: '1',
      statusId: TICKET_STATUS.ACCEPTED,
      status: 'ACCEPTED',
      rejectionReason: null,
    });

    expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1n,
          statusId: TICKET_STATUS.PENDING_REVIEW,
        },
        data: {
          statusId: TICKET_STATUS.ACCEPTED,
          rejectionReason: null,
        },
      }),
    );

    expect(prismaMock.ticketActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'TICKET_ACCEPTED',
        }),
      }),
    );

    expect(
      notificationsMock.createTicketNotification,
    ).toHaveBeenCalledWith(prismaMock, {
      userId: 20n,
      ticketId: 1n,
      title: 'Ticket accepted',
      type: 'TICKET_ACCEPTED',
      message:
        'Your ticket EMS-test has been accepted by an administrator.',
    });
  });

  it('rejects accept for a ticket that is not pending review', async () => {
    setupTicket(TICKET_STATUS.IN_PROGRESS);

    const service = createService();

    await expect(service.acceptTicket('1', '10')).rejects.toThrow(
      ConflictException,
    );

    expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.ticketStatusHistory.create).not.toHaveBeenCalled();
    expect(prismaMock.ticketActivityLog.create).not.toHaveBeenCalled();
  });

  it('aborts the review transaction when the notification write fails', async () => {
    setupTicket(TICKET_STATUS.PENDING_REVIEW);
    notificationsMock.createTicketNotification
      .mockRejectedValueOnce(new Error('Notification write failed'));

    const service = createService();

    await expect(service.acceptTicket('1', '10')).rejects.toThrow(
      'Notification write failed',
    );
  });
});

describe('AdminService.rejectTicket', () => {
  it('rejects an empty rejection reason', async () => {
    const service = createService();

    await expect(
      service.rejectTicket('1', '10', { reason: '   ' }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a PENDING_REVIEW ticket with the provided reason', async () => {
    setupTicket(TICKET_STATUS.PENDING_REVIEW);

    const service = createService();

    const result = await service.rejectTicket('1', '10', {
      reason: 'Missing required details',
    });

    expect(result.data).toMatchObject({
      statusId: TICKET_STATUS.REJECTED,
      status: 'REJECTED',
      rejectionReason: 'Missing required details',
    });

    expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          statusId: TICKET_STATUS.REJECTED,
          rejectionReason: 'Missing required details',
        },
      }),
    );

    expect(prismaMock.ticketActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'TICKET_REJECTED',
        }),
      }),
    );

    expect(
      notificationsMock.createTicketNotification,
    ).toHaveBeenCalledWith(prismaMock, {
      userId: 20n,
      ticketId: 1n,
      title: 'Ticket rejected',
      type: 'TICKET_REJECTED',
      message: 'Your ticket EMS-test has been rejected: Missing required details',
    });
  });
});
