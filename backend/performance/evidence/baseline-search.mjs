import 'dotenv/config';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Prisma, PrismaClient } from '@prisma/client';
import { createMariaDbAdapter } from '../../dist/database/prisma/mariadb-adapter.js';

const evidenceDir = dirname(fileURLToPath(import.meta.url));
const outputPath = join(evidenceDir, 'search-baseline.jsonl');
const planOnly = process.env.PLAN_ONLY === 'YES';
const iterations = Number(process.env.BENCHMARK_ITERATIONS ?? 100);
const warmups = Number(process.env.BENCHMARK_WARMUPS ?? 5);
const classes = [
  { name: 'rare-term', pattern: '%RareSearchTermQzv731%' },
  { name: 'no-match', pattern: '%NoSuchTokenVq987%' },
  { name: 'common-term', pattern: '%login%' },
];

if (!Number.isInteger(iterations) || iterations < 1 || iterations > 1000) {
  throw new Error('BENCHMARK_ITERATIONS must be from 1 to 1000');
}

function searchSql(pattern, userId) {
  return Prisma.sql`
    SELECT /*+ MAX_EXECUTION_TIME(5000) */ t.id
    FROM tickets AS t
    LEFT JOIN ticket_categories AS c ON c.id = t.category_id
    LEFT JOIN ticket_sub_categories AS sc ON sc.id = t.sub_category_id
    LEFT JOIN users AS u ON u.id = t.user_id
    WHERE (
      t.subject LIKE ${pattern}
      OR t.description LIKE ${pattern}
      OR t.ticket_number LIKE ${pattern}
      OR c.name LIKE ${pattern}
      OR sc.name LIKE ${pattern}
      OR u.name LIKE ${pattern}
      OR u.email LIKE ${pattern}
    )
    ${userId === null ? Prisma.empty : Prisma.sql`AND t.user_id = ${userId}`}
    ORDER BY t.created_at DESC, t.id DESC
    LIMIT 21
  `;
}

function summarize(samples) {
  const ordered = [...samples].sort((a, b) => a - b);
  const percentile = (p) => ordered[Math.max(0, Math.ceil(ordered.length * p) - 1)] ?? null;
  return {
    completed: samples.length,
    p50_ms: percentile(0.5),
    p95_ms: percentile(0.95),
    max_ms: ordered.at(-1) ?? null,
  };
}

const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });
try {
  const target = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname.toLowerCase())) {
    throw new Error('Refusing benchmark against non-loopback database');
  }
  const dbName = decodeURIComponent(target.pathname.replace(/^\//, ''));
  if (!/(test|perf)/i.test(dbName)) throw new Error('Refusing non-disposable database');

  const [{ version }, owners] = await Promise.all([
    prisma.$queryRaw`SELECT VERSION() AS version`,
    prisma.$queryRaw`SELECT user_id, COUNT(*) AS ticket_count FROM tickets GROUP BY user_id ORDER BY ticket_count DESC LIMIT 1`,
  ]);
  const normalUserId = owners[0].user_id;
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(outputPath, '');
  console.log(JSON.stringify({ database: dbName, version, normalUserId: normalUserId.toString(), iterations, warmups, planOnly }));

  for (const role of [
    { name: 'normal-user', userId: normalUserId },
    { name: 'admin', userId: null },
  ]) {
    for (const queryClass of classes) {
      const query = searchSql(queryClass.pattern, role.userId);
      const record = {
        role: role.name,
        class: queryClass.name,
        query: queryClass.pattern,
        normalUserId: role.userId?.toString() ?? null,
      };
      try {
        const explain = await prisma.$queryRaw(Prisma.sql`EXPLAIN ANALYZE ${query}`);
        record.explainAnalyze = explain;
      } catch (error) {
        record.explainError = String(error?.message ?? error);
      }

      if (!planOnly) {
        const samples = [];
        let timeouts = 0;
        for (let i = 0; i < warmups + iterations; i += 1) {
          const started = performance.now();
          try {
            await prisma.$queryRaw(query);
            if (i >= warmups) samples.push(Number((performance.now() - started).toFixed(3)));
          } catch (error) {
            const elapsed = Number((performance.now() - started).toFixed(3));
            if (i >= warmups) {
              samples.push(elapsed);
              timeouts += 1;
            }
            if (!String(error?.message ?? error).match(/maximum statement execution time|query execution was interrupted|3024/i)) {
              record.benchmarkError = String(error?.message ?? error);
              break;
            }
          }
          if ((i + 1) % 20 === 0) console.log(`${role.name}/${queryClass.name}: ${i + 1}/${warmups + iterations}`);
        }
        record.timeoutCount = timeouts;
        record.timing = summarize(samples);
      }

      await appendFile(outputPath, `${JSON.stringify(record, (_key, value) => typeof value === 'bigint' ? value.toString() : value)}\n`);
      console.log(`${role.name}/${queryClass.name} saved`);
    }
  }
} finally {
  await prisma.$disconnect();
}
