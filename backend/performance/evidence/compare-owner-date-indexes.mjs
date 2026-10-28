import 'dotenv/config';
import { appendFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Prisma, PrismaClient } from '@prisma/client';
import { createMariaDbAdapter } from '../../dist/database/prisma/mariadb-adapter.js';

const evidenceDir = dirname(fileURLToPath(import.meta.url));
const outputPath = join(evidenceDir, 'owner-date-index-comparison.jsonl');
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });
const indexes = [
  { name: 'idx_perf_user_created', columns: 'user_id, created_at' },
  { name: 'idx_perf_user_created_id', columns: 'user_id, created_at, id' },
];

function searchSql(userId, forcedIndex = null) {
  const force = forcedIndex ? Prisma.sql`FORCE INDEX (${Prisma.raw(forcedIndex)})` : Prisma.empty;
  const pattern = '%login%';
  return Prisma.sql`
    SELECT /*+ MAX_EXECUTION_TIME(5000) */ t.id
    FROM tickets AS t ${force}
    LEFT JOIN ticket_categories AS c ON c.id = t.category_id
    LEFT JOIN ticket_sub_categories AS sc ON sc.id = t.sub_category_id
    LEFT JOIN users AS u ON u.id = t.user_id
    WHERE t.user_id = ${userId}
      AND (t.subject LIKE ${pattern} OR t.description LIKE ${pattern}
        OR t.ticket_number LIKE ${pattern} OR c.name LIKE ${pattern}
        OR sc.name LIKE ${pattern} OR u.name LIKE ${pattern} OR u.email LIKE ${pattern})
    ORDER BY t.created_at DESC, t.id DESC
    LIMIT 21
  `;
}

const records = [];
try {
  const db = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '::1'].includes(db.hostname.toLowerCase()) || !/(test|perf)/i.test(db.pathname)) {
    throw new Error('Refusing index comparison outside loopback test/perf database');
  }
  const [owner] = await prisma.$queryRaw`SELECT user_id FROM tickets GROUP BY user_id ORDER BY COUNT(*) DESC LIMIT 1`;
  const userId = owner.user_id;
  const original = await prisma.$queryRaw(Prisma.sql`EXPLAIN ANALYZE ${searchSql(userId)}`);
  records.push({ candidate: 'existing indexes', userId: userId.toString(), explainAnalyze: original });

  for (const index of indexes) {
    let created = false;
    const startCreate = performance.now();
    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX ${index.name} ON tickets (${index.columns})`);
      created = true;
      const createMs = Number((performance.now() - startCreate).toFixed(1));
      const plan = await prisma.$queryRaw(Prisma.sql`EXPLAIN ANALYZE ${searchSql(userId, index.name)}`);
      const samples = [];
      for (let i = 0; i < 105; i += 1) {
        const start = performance.now();
        await prisma.$queryRaw(searchSql(userId, index.name));
        if (i >= 5) samples.push(Number((performance.now() - start).toFixed(3)));
      }
      samples.sort((a, b) => a - b);
      records.push({
        candidate: `(${index.columns})`,
        createMs,
        explainAnalyze: plan,
        timing: {
          completed: samples.length,
          p50_ms: samples[Math.ceil(samples.length * 0.5) - 1],
          p95_ms: samples[Math.ceil(samples.length * 0.95) - 1],
          max_ms: samples.at(-1),
        },
      });
    } finally {
      if (created) await prisma.$executeRawUnsafe(`DROP INDEX ${index.name} ON tickets`);
    }
    await appendFile(outputPath, `${JSON.stringify(records.at(-1), (_key, value) => typeof value === 'bigint' ? value.toString() : value)}\n`);
  }
  await writeFile(join(evidenceDir, 'owner-date-index-baseline.json'), JSON.stringify(records[0], (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  await writeFile(outputPath, records.slice(1).map((record) => JSON.stringify(record, (_key, value) => typeof value === 'bigint' ? value.toString() : value)).join('\n') + '\n');
} finally {
  await prisma.$disconnect();
}

console.log(JSON.stringify(records.map(({ candidate, createMs, timing }) => ({ candidate, createMs, timing }))));
