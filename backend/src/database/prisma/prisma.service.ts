
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
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
