import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { createMariaDbAdapter } from '../../dist/database/prisma/mariadb-adapter.js';

const sourceDatabase = 'ems_support_test';
const spikeDatabase = 'ems_support_ft_spike';
const table = Prisma.raw(`\`${spikeDatabase}\`.\`ticket_search\``);
const evidencePath = join(dirname(fileURLToPath(import.meta.url)), 'fulltext-spike-results.json');
const commonTerm = 'login';
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });
const resume = process.env.SPIKE_RESUME === 'YES';

function guardedDatabase() {
  const target = new URL(process.env.DATABASE_URL);
  const database = decodeURIComponent(target.pathname.replace(/^\//, ''));
  if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname.toLowerCase()) || database !== sourceDatabase) {
    throw new Error(`Refusing spike source ${target.hostname}/${database}; expected localhost/${sourceDatabase}`);
  }
  return target;
}

async function explain(query) {
  try {
    return await prisma.$queryRaw(Prisma.sql`EXPLAIN ANALYZE ${query}`);
  } catch (error) {
    return { error: String(error?.message ?? error) };
  }
}

const fullTextPredicate = Prisma.sql`MATCH(subject, description_text) AGAINST (${commonTerm} IN NATURAL LANGUAGE MODE)`;
const capQuery = ({ ownerId = null, forceIndex = 'ft_subject_description' } = {}) => Prisma.sql`
  SELECT ticket_id,
    MATCH(subject, description_text) AGAINST (${commonTerm} IN NATURAL LANGUAGE MODE) AS relevance
  FROM ${table} FORCE INDEX (${Prisma.raw(forceIndex)})
  WHERE ${fullTextPredicate}
    AND created_at >= DATE_SUB(NOW(3), INTERVAL 90 DAY)
    AND status_id = 1
    ${ownerId === null ? Prisma.empty : Prisma.sql`AND user_id = ${ownerId}`}
  ORDER BY relevance DESC, ticket_id DESC
  LIMIT 5000
`;

try {
  guardedDatabase();
  const existing = await prisma.$queryRaw`SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ${spikeDatabase}`;
  if (existing.length && !resume) throw new Error(`${spikeDatabase} already exists; set SPIKE_RESUME=YES to continue the existing local spike copy`);
  if (!existing.length && resume) throw new Error(`${spikeDatabase} does not exist; cannot resume`);

  const [server, total] = await Promise.all([
    prisma.$queryRaw`SELECT VERSION() AS version, @@version_comment AS version_comment`,
    prisma.$queryRaw`SELECT COUNT(*) AS total FROM tickets`,
  ]);
  if (Number(total[0].total) !== 1_000_000) throw new Error('Spike source does not have exactly 1,000,000 tickets');

  const results = {
    sourceDatabase,
    spikeDatabase,
    server: server[0],
    sourceTicketCount: String(total[0].total),
    method: 'EXPLAIN ANALYZE only; no application code or cursor changes',
    commonTerm,
    cutoff: 'last 90 days at query time',
  };

  if (!resume) {
    await prisma.$executeRawUnsafe(`CREATE DATABASE \`${spikeDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    await prisma.$executeRawUnsafe(`
    CREATE TABLE \`${spikeDatabase}\`.\`ticket_search\` (
      ticket_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      created_at DATETIME(3) NOT NULL,
      status_id BIGINT UNSIGNED NOT NULL,
      subject VARCHAR(255) NOT NULL,
      description_text LONGTEXT NOT NULL,
      PRIMARY KEY (ticket_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    const copyStarted = performance.now();
    await prisma.$executeRawUnsafe(`
    INSERT INTO \`${spikeDatabase}\`.\`ticket_search\`
      (ticket_id,user_id,created_at,status_id,subject,description_text)
    SELECT id,user_id,created_at,status_id,subject,
      TRIM(REGEXP_REPLACE(REGEXP_REPLACE(description,'<[^>]+>',' '),'[[:space:]]+',' '))
    FROM \`${sourceDatabase}\`.\`tickets\`
    `);
    results.copyDurationMs = Number((performance.now() - copyStarted).toFixed(1));
    const [copied] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS total FROM \`${spikeDatabase}\`.\`ticket_search\``);
    results.copiedTicketCount = String(copied.total);
    if (Number(copied.total) !== 1_000_000) throw new Error('Spike copy row count mismatch');

    const indexes = [];
    for (const [name, ddl] of [
    ['idx_user_status_created', `CREATE INDEX idx_user_status_created ON \`${spikeDatabase}\`.\`ticket_search\` (user_id,status_id,created_at)`],
    ['idx_status_created', `CREATE INDEX idx_status_created ON \`${spikeDatabase}\`.\`ticket_search\` (status_id,created_at)`],
    ['ft_subject_description', `CREATE FULLTEXT INDEX ft_subject_description ON \`${spikeDatabase}\`.\`ticket_search\` (subject,description_text)`],
    ]) {
      const started = performance.now();
      await prisma.$executeRawUnsafe(ddl);
      indexes.push({ name, buildDurationMs: Number((performance.now() - started).toFixed(1)) });
    }
    results.testOnlyIndexBuilds = indexes;
  }

  const [spikeTable] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS total FROM \`${spikeDatabase}\`.\`ticket_search\``);
  if (Number(spikeTable.total) !== 1_000_000) throw new Error('Spike table is incomplete or not a million-row copy');
  const indexRows = await prisma.$queryRawUnsafe(`SHOW INDEX FROM \`${spikeDatabase}\`.\`ticket_search\``);
  results.spikeIndexes = indexRows.map((row) => ({ name: row.Key_name, column: row.Column_name }));
  const hasFullText = indexRows.some((row) => row.Key_name === 'ft_subject_description');
  if (!hasFullText) throw new Error('Spike FULLTEXT index is missing');

  const [{ user_id: ownerId }] = await prisma.$queryRaw`SELECT user_id FROM tickets GROUP BY user_id ORDER BY COUNT(*) DESC LIMIT 1`;
  results.normalUserId = ownerId.toString();
  const normalQueryCount = await prisma.$queryRaw(Prisma.sql`
    SELECT COUNT(*) AS matches FROM ${table}
    WHERE ${fullTextPredicate}
      AND user_id = ${ownerId}
      AND created_at >= DATE_SUB(NOW(3), INTERVAL 90 DAY)
      AND status_id = 1
  `);
  results.normalUserFilteredMatchCount = String(normalQueryCount[0].matches);
  results.normalUserUserIdFirst = await explain(capQuery({ ownerId, forceIndex: 'idx_user_status_created' }));
  results.normalUserFullTextFirst = await explain(capQuery({ ownerId, forceIndex: 'ft_subject_description' }));

  const broadCount = await prisma.$queryRaw(Prisma.sql`
    SELECT COUNT(*) AS matches FROM ${table}
    WHERE ${fullTextPredicate}
      AND created_at >= DATE_SUB(NOW(3), INTERVAL 90 DAY)
      AND status_id = 1
  `);
  results.broadAdminFilteredMatchCount = String(broadCount[0].matches);

  const broadCandidates = capQuery();
  results.broadAdminFullTextFirst = await explain(broadCandidates);
  await writeFile(evidencePath, JSON.stringify(results, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  const startedCandidates = performance.now();
  const candidateRows = await prisma.$queryRaw(broadCandidates);
  results.candidateQueryDurationMs = Number((performance.now() - startedCandidates).toFixed(1));
  results.selectedCandidateCount = candidateRows.length;
  results.selectedCandidateIds = candidateRows.map((row) => row.ticket_id.toString());
  results.candidateIdSha256 = createHash('sha256').update(results.selectedCandidateIds.join(',')).digest('hex');
  results.candidateFirstId = results.selectedCandidateIds[0] ?? null;
  results.candidateLastId = results.selectedCandidateIds.at(-1) ?? null;
  await writeFile(evidencePath, JSON.stringify(results, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

  const outerQuery = Prisma.sql`
    WITH candidates AS (${broadCandidates})
    SELECT s.ticket_id,s.created_at
    FROM candidates AS c
    JOIN ${table} AS s ON s.ticket_id=c.ticket_id
    ORDER BY s.created_at DESC,s.ticket_id DESC
    LIMIT 21
  `;
  results.outerDateOrderAfterCap = await explain(outerQuery);
  results.outerDateOrderRows = await prisma.$queryRaw(outerQuery);

  await writeFile(evidencePath, JSON.stringify(results, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  console.log(JSON.stringify({
    spikeDatabase,
    version: server[0].version,
    sourceTicketCount: results.sourceTicketCount,
    copiedTicketCount: results.copiedTicketCount,
    testOnlyIndexBuilds: results.testOnlyIndexBuilds ?? 'index timings observed during initial copy; source table retained for resume',
    normalUserId: results.normalUserId,
    normalUserFilteredMatchCount: results.normalUserFilteredMatchCount,
    broadAdminFilteredMatchCount: results.broadAdminFilteredMatchCount,
    selectedCandidateCount: results.selectedCandidateCount,
    candidateIdSha256: results.candidateIdSha256,
    candidateFirstId: results.candidateFirstId,
    candidateLastId: results.candidateLastId,
    candidateQueryDurationMs: results.candidateQueryDurationMs,
    evidencePath,
  }));
} finally {
  await prisma.$disconnect();
}
