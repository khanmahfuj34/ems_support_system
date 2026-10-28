import 'dotenv/config';
import { appendFile, access, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Prisma, PrismaClient } from '@prisma/client';
import { buildTicketDescriptionTextFields } from '../../dist/module/tickets/utils/ticket-description-text.js';
import { createMariaDbAdapter } from '../../dist/database/prisma/mariadb-adapter.js';

const sourceDatabase = 'ems_support_test';
const scratchDatabase = 'ems_support_test_wholeword_spike';
const table = Prisma.raw(`\`${scratchDatabase}\`.\`ticket_search\``);
const outputDirectory = dirname(fileURLToPath(import.meta.url));
const resultsPath = join(outputDirectory, 'whole-word-window-results.json');
const progressPath = join(outputDirectory, 'whole-word-window-results.jsonl');
const batchSize = 1000;
const warmups = 5;
const iterations = 100;
const classes = [
  { name: 'rare-term', term: 'RareSearchTermQzv731', booleanQuery: '+RareSearchTermQzv731', regex: '(^|[^[:alnum:]_])RareSearchTermQzv731([^[:alnum:]_]|$)' },
  { name: 'no-match', term: 'NoMatchTokenQzv947', booleanQuery: '+NoMatchTokenQzv947', regex: '(^|[^[:alnum:]_])NoMatchTokenQzv947([^[:alnum:]_]|$)' },
  { name: 'common-term', term: 'login', booleanQuery: '+login', regex: '(^|[^[:alnum:]_])login([^[:alnum:]_]|$)' },
  { name: 'prefix-term', term: 'pass', booleanQuery: '+pass*', regex: '(^|[^[:alnum:]_])pass[[:alnum:]_]*' },
  { name: 'typo-term', term: 'lgin', booleanQuery: '+lgin', regex: '(^|[^[:alnum:]_])lgin([^[:alnum:]_]|$)' },
];

function assertLocalDisposableSource() {
  const target = new URL(process.env.DATABASE_URL);
  const dbName = decodeURIComponent(target.pathname.replace(/^\//, ''));
  if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname.toLowerCase()) || dbName !== sourceDatabase) {
    throw new Error(`Refusing measurement source ${target.hostname}/${dbName}; expected localhost/${sourceDatabase}`);
  }
}

function buildQuery(plan, cls, days, statusId, categoryId) {
  const cutoff = Prisma.raw(`DATE_SUB(NOW(3), INTERVAL ${days} DAY)`);
  if (plan === 'A-fulltext') {
    return Prisma.sql`
      SELECT /*+ MAX_EXECUTION_TIME(5000) */ ticket_id
      FROM ${table} FORCE INDEX (ft_subject_description)
      WHERE MATCH(subject, description_text) AGAINST (${cls.booleanQuery} IN BOOLEAN MODE)
        AND created_at >= ${cutoff}
        AND status_id = ${statusId}
        AND category_id = ${categoryId}
      ORDER BY created_at DESC, ticket_id DESC
      LIMIT 21
    `;
  }

  return Prisma.sql`
    SELECT /*+ MAX_EXECUTION_TIME(5000) */ ticket_id
    FROM ${table} FORCE INDEX (idx_created_status_category)
    WHERE created_at >= ${cutoff}
      AND status_id = ${statusId}
      AND category_id = ${categoryId}
      AND (
        REGEXP_LIKE(subject, ${cls.regex}, 'i')
        OR REGEXP_LIKE(description_text, ${cls.regex}, 'i')
      )
    ORDER BY created_at DESC, ticket_id DESC
    LIMIT 21
  `;
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (fraction) => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? null;
  return {
    completed: samples.length,
    p50_ms: percentile(0.5),
    p95_ms: percentile(0.95),
    max_ms: sorted.at(-1) ?? null,
  };
}

function extractRowsExamined(explainRows, plan) {
  const explain = explainRows?.[0]?.EXPLAIN;
  if (typeof explain !== 'string') return null;
  const nodePattern = plan === 'A-fulltext'
    ? /Full-text index search[^\n]*actual time=[^\n]*?rows=(\d+)/
    : /Index range scan[^\n]*actual time=[^\n]*?rows=(\d+)/;
  const match = explain.match(nodePattern);
  return match ? Number(match[1]) : null;
}

const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });
const results = {
  sourceDatabase,
  scratchDatabase,
  methodology: 'Scratch-only measurement. description_text built with the shared buildTicketDescriptionTextFields helper. Standard parser FULLTEXT; no application code changed.',
  windowsDays: [30, 90],
  classes: classes.map(({ name, term }) => ({ name, term })),
  warmups,
  measuredQueriesPerClassWindowPlan: iterations,
  results: [],
};

try {
  assertLocalDisposableSource();
  try {
    await access(resultsPath, constants.F_OK);
    throw new Error(`${resultsPath} already exists; refusing to overwrite earlier measurement evidence`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const [sourceCount, version] = await Promise.all([
    prisma.$queryRaw`SELECT COUNT(*) AS row_count FROM tickets`,
    prisma.$queryRaw`SELECT VERSION() AS version, @@version_comment AS version_comment`,
  ]);
  if (Number(sourceCount[0].row_count) !== 1_000_000) throw new Error('Expected exactly 1,000,000 source tickets');
  results.mysql = version[0];
  results.sourceRows = String(sourceCount[0].row_count);

  const [filter] = await prisma.$queryRaw`
    SELECT status_id, category_id, COUNT(*) AS row_count
    FROM tickets
    GROUP BY status_id, category_id
    ORDER BY row_count DESC
    LIMIT 1
  `;
  results.statusFilter = String(filter.status_id);
  results.categoryFilter = String(filter.category_id);
  results.filterCombinationRows = String(filter.row_count);

  const schemaExists = await prisma.$queryRaw`SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ${scratchDatabase}`;
  if (schemaExists.length) throw new Error(`${scratchDatabase} already exists; refusing to overwrite an existing scratch database`);

  await prisma.$executeRawUnsafe(`CREATE DATABASE \`${scratchDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE \`${scratchDatabase}\`.\`ticket_search\` (
      ticket_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      created_at DATETIME(3) NOT NULL,
      status_id BIGINT UNSIGNED NOT NULL,
      category_id BIGINT UNSIGNED NOT NULL,
      subject VARCHAR(255) NOT NULL,
      description_text LONGTEXT NOT NULL,
      PRIMARY KEY (ticket_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  let afterId = 0n;
  let copied = 0;
  const copyStart = performance.now();
  while (true) {
    const sourceRows = await prisma.ticket.findMany({
      where: { id: { gt: afterId } },
      orderBy: { id: 'asc' },
      take: batchSize,
      select: {
        id: true,
        userId: true,
        createdAt: true,
        statusId: true,
        categoryId: true,
        subject: true,
        description: true,
      },
    });
    if (sourceRows.length === 0) break;

    const values = sourceRows.map((row) => {
      const { plainText } = buildTicketDescriptionTextFields(row.description);
      return Prisma.sql`(${row.id},${row.userId},${row.createdAt},${row.statusId},${row.categoryId},${row.subject},${plainText})`;
    });
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO ${table}
        (ticket_id,user_id,created_at,status_id,category_id,subject,description_text)
      VALUES ${Prisma.join(values)}
    `);
    afterId = sourceRows.at(-1).id;
    copied += sourceRows.length;
    if (copied % 50_000 === 0 || copied === 1_000_000) {
      console.log(`Copied ${copied.toLocaleString()} / 1,000,000 rows via shared helper`);
    }
  }
  results.copyRows = copied;
  results.copyDurationMs = Number((performance.now() - copyStart).toFixed(1));
  if (copied !== 1_000_000) throw new Error(`Scratch backfill copied ${copied} rows; expected 1,000,000`);

  const indexBuilds = [];
  for (const [name, ddl] of [
    ['idx_created_status_category', `CREATE INDEX idx_created_status_category ON \`${scratchDatabase}\`.\`ticket_search\` (created_at,status_id,category_id)`],
    ['ft_subject_description', `CREATE FULLTEXT INDEX ft_subject_description ON \`${scratchDatabase}\`.\`ticket_search\` (subject,description_text)`],
  ]) {
    const started = performance.now();
    await prisma.$executeRawUnsafe(ddl);
    indexBuilds.push({ name, durationMs: Number((performance.now() - started).toFixed(1)) });
  }
  results.indexBuilds = indexBuilds;
  results.scratchFullTextRows = String((await prisma.$queryRaw(Prisma.sql`
    SELECT COUNT(*) AS matches FROM ${table}
    WHERE MATCH(subject,description_text) AGAINST ('+login' IN BOOLEAN MODE)
  `))[0].matches);
  await writeFile(resultsPath, JSON.stringify(results, null, 2));

  for (const days of [30, 90]) {
    for (const cls of classes) {
      for (const plan of ['A-fulltext', 'B-date-first']) {
        const query = buildQuery(plan, cls, days, filter.status_id, filter.category_id);
        let explainAnalyze;
        let explainError = null;
        try {
          explainAnalyze = await prisma.$queryRaw(Prisma.sql`EXPLAIN ANALYZE ${query}`);
        } catch (error) {
          explainError = String(error?.message ?? error);
        }
        const samples = [];
        let timeoutCount = 0;
        let otherError = null;
        for (let index = 0; index < warmups + iterations; index += 1) {
          const started = performance.now();
          try {
            await prisma.$queryRaw(query);
          } catch (error) {
            const message = String(error?.message ?? error);
            if (/3024|maximum statement execution time|query execution was interrupted/i.test(message)) {
              if (index >= warmups) timeoutCount += 1;
            } else {
              otherError = message;
              break;
            }
          } finally {
            if (index >= warmups) samples.push(Number((performance.now() - started).toFixed(3)));
          }
          if ((index + 1) % 25 === 0) console.log(`${plan}/${days}d/${cls.name}: ${index + 1}/${warmups + iterations}`);
        }

        const record = {
          plan,
          windowDays: days,
          class: cls.name,
          term: cls.term,
          filters: { statusId: String(filter.status_id), categoryId: String(filter.category_id) },
          rowsExamined: extractRowsExamined(explainAnalyze, plan === 'A-fulltext' ? 'A-fulltext' : 'B-date-first'),
          explainAnalyze: explainAnalyze ?? null,
          explainError,
          timeoutCount,
          otherError,
          timing: summarize(samples),
        };
        results.results.push(record);
        await appendFile(progressPath, `${JSON.stringify(record, (_key, value) => typeof value === 'bigint' ? value.toString() : value)}\n`);
        await writeFile(resultsPath, JSON.stringify(results, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
        console.log(`${plan}/${days}d/${cls.name} saved; p95=${record.timing.p95_ms} ms, rowsExamined=${record.rowsExamined}, timeouts=${timeoutCount}`);
      }
    }
  }

  console.log(JSON.stringify({ scratchDatabase, copied, indexBuilds, resultsPath, records: results.results.length }));
} finally {
  await prisma.$disconnect();
}
