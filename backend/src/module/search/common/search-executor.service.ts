import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service.js';
import {
  SEARCH_MAX_CONCURRENT,
  SEARCH_STATEMENT_TIMEOUT_MS,
  SEARCH_TRANSACTION_MAX_WAIT_MS,
  SEARCH_TRANSACTION_TIMEOUT_MS,
} from '../search.constants.js';
import { mapSearchError } from './search-error-handler.js';

/**
 * Runs search work with: concurrency cap (429), MySQL statement timeout
 * scoped to one transaction (restored before the connection returns to the
 * pool), and timeout/pool error mapping (503).
 */
@Injectable()
export class SearchExecutor {
  private active = 0;

  constructor(private readonly prisma: PrismaService) {}

  async run<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (this.active >= SEARCH_MAX_CONCURRENT) {
      throw new HttpException(
        'Too many searches are running; try again shortly',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.active += 1;
    try {
      return await this.withStatementTimeout(operation);
    } catch (error) {
      throw mapSearchError(error);
    } finally {
      this.active -= 1;
    }
  }

  private async withStatementTimeout<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        const settings = await tx.$queryRaw<
          { max_execution_time: number | bigint }[]
        >`SELECT @@SESSION.max_execution_time AS max_execution_time`;
        const previous = settings[0]?.max_execution_time;
        if (previous === undefined) {
          throw new Error('Could not read the current MySQL statement timeout');
        }

        await tx.$executeRaw`SET SESSION max_execution_time = ${SEARCH_STATEMENT_TIMEOUT_MS}`;

        let result: T | undefined;
        let operationError: unknown;
        let operationFailed = false;
        let restoreError: unknown;
        let restoreFailed = false;

        try {
          result = await operation(tx);
        } catch (error) {
          operationFailed = true;
          operationError = error;
        }

        try {
          await tx.$executeRaw`SET SESSION max_execution_time = ${previous}`;
        } catch (error) {
          restoreFailed = true;
          restoreError = error;
        }

        if (operationFailed) throw operationError;
        if (restoreFailed) throw restoreError;
        return result as T;
      },
      {
        timeout: SEARCH_TRANSACTION_TIMEOUT_MS,
        maxWait: SEARCH_TRANSACTION_MAX_WAIT_MS,
      },
    );
  }
}