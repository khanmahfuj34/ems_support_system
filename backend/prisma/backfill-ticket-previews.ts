import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { createMariaDbAdapter } from '../src/database/prisma/mariadb-adapter.js';
import { buildTicketDescriptionTextFields } from '../src/module/tickets/utils/ticket-description-text.js';

const BATCH_SIZE = 500;

function assertDisposableLocalDatabase(): void {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL is not configured');

  const databaseUrl = new URL(rawUrl);
  const host = databaseUrl.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const database = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''));

  if (!['localhost', '127.0.0.1', '::1'].includes(host) || !/(test|perf)/i.test(database)) {
    throw new Error(
      'Safety stop: backfill only accepts a loopback database with test or perf in its name',
    );
  }
}

async function main(): Promise<void> {
  assertDisposableLocalDatabase();
  const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

  try {
    await prisma.$connect();
    const total = await prisma.ticket.count();
    let processed = 0;
    let afterId = 0n;

    while (true) {
      const rows = await prisma.ticket.findMany({
        where: { id: { gt: afterId } },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        select: { id: true, description: true },
      });

      if (rows.length === 0) break;

      const cases = rows.map((ticket) => {
        const { preview } = buildTicketDescriptionTextFields(ticket.description);
        return Prisma.sql`WHEN ${ticket.id} THEN ${preview}`;
      });
      const ids = Prisma.join(rows.map((ticket) => Prisma.sql`${ticket.id}`));
      const update = Prisma.sql`
        UPDATE tickets
        SET description_preview = CASE id ${Prisma.join(cases, ' ')} ELSE description_preview END
        WHERE id IN (${ids})
      `;

      await prisma.$executeRaw(update);
      afterId = rows[rows.length - 1].id;
      processed += rows.length;

      if (processed % 10_000 === 0 || processed === total) {
        console.log(`Backfilled ${processed.toLocaleString()} / ${total.toLocaleString()} tickets`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    'Ticket preview backfill failed:',
    error instanceof Error ? error.message : 'Unknown error',
  );
  process.exitCode = 1;
});
