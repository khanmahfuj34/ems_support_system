import { ServiceUnavailableException } from '@nestjs/common';

import { SearchExecutor } from './search-executor.service.js';

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
}));

vi.mock('../../../database/prisma/prisma.service.js', () => ({
  PrismaService: class {},
}));

function createExecutor() {
  return new SearchExecutor(prismaMock as never);
}

describe('SearchExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(prismaMock),
    );
    prismaMock.$queryRaw.mockResolvedValue([{ max_execution_time: 0 }]);
    prismaMock.$executeRaw.mockResolvedValue(0);
  });

  it('allows five concurrent searches and rejects the sixth with 429', async () => {
    let release!: () => void;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const executor = createExecutor();
    const operation = async () => {
      await released;
      return 'ok';
    };

    const active = Array.from({ length: 5 }, () => executor.run(operation));

    await expect(executor.run(operation)).rejects.toMatchObject({
      status: 429,
    });

    release();
    await expect(Promise.all(active)).resolves.toEqual([
      'ok',
      'ok',
      'ok',
      'ok',
      'ok',
    ]);
    await expect(executor.run(operation)).resolves.toBe('ok');
  });

  it('sets and restores the session statement timeout', async () => {
    const executor = createExecutor();

    await executor.run(async () => 'result');

    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 8000,
      maxWait: 3000,
    });
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(2);
    const set = String(prismaMock.$executeRaw.mock.calls[0][0]);
    const restore = String(prismaMock.$executeRaw.mock.calls[1][0]);
    expect(set).toContain('SET SESSION');
    expect(restore).toContain('SET SESSION');
    expect(prismaMock.$executeRaw.mock.calls[0].slice(1)).toContain(5000);
  });

  it('maps statement timeout errors to 503', async () => {
    prismaMock.$transaction.mockRejectedValue({
      code: 'P2010',
      meta: {
        driverAdapterError: {
          cause: {
            code: 3024,
            originalCode: '3024',
            message:
              'Query execution was interrupted, maximum statement execution time exceeded',
          },
        },
      },
    });

    await expect(createExecutor().run(async () => 'unused')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it.each(['P2024', 'P2028'])('maps pool error %s to 503', async (code) => {
    prismaMock.$transaction.mockRejectedValue({ code });

    await expect(createExecutor().run(async () => 'unused')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('does not map unrelated errors', async () => {
    const error = new Error('connection belongs to another request');
    prismaMock.$transaction.mockRejectedValue(error);

    await expect(
      createExecutor().run(async () => 'unused'),
    ).rejects.toBe(error);
  });

  it('preserves the operation error when restoring the timeout fails', async () => {
    const error = new Error('operation failed');
    prismaMock.$executeRaw
      .mockResolvedValueOnce(0)
      .mockRejectedValueOnce(new Error('restore failed'));

    await expect(
      createExecutor().run(async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });
});
