
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  createMariaDbAdapter,
  getMariaDbConnectionDiagnostics,
} from './mariadb-adapter.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: createMariaDbAdapter(),
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      const { host, tlsEnabled } = getMariaDbConnectionDiagnostics();
      const cause = error instanceof Error ? error : new Error('Unknown connection error');
      const codedError = cause as Error & { code?: unknown; cause?: unknown };
      const nestedCause = codedError.cause as (Error & { code?: unknown }) | undefined;
      const code = codedError.code ?? nestedCause?.code;
      const safeMessage = cause.message
        .replace(/((?:mysql|mariadb):\/\/)[^@\s]+@/gi, '$1[redacted]@')
        .replace(/\b(password|passwd|pwd|user|username)\s*[:=]\s*('[^']*'|"[^"]*"|[^,\s;]+)/gi, '$1=[redacted]');

      console.error(
        `[database] connection failed host=${host} tls=${tlsEnabled ? 'enabled' : 'disabled'} code=${typeof code === 'string' || typeof code === 'number' ? code : 'unknown'} error=${safeMessage}`,
      );
      throw error;
    }

    try {
      const timeoutSetting = await this.$queryRaw<
        { max_execution_time: number | bigint }[]
      >`SELECT @@max_execution_time AS max_execution_time`;
      if (timeoutSetting.length === 0) {
        throw new Error('MySQL did not return @@max_execution_time');
      }
    } catch (error) {
      throw new Error(
        'Database startup check failed: ticket search statement timeouts require MySQL with @@max_execution_time. MariaDB is not supported by this timeout configuration.',
        { cause: error },
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
