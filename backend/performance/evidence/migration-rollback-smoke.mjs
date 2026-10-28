import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { createMariaDbAdapter } from '../../dist/database/prisma/mariadb-adapter.js';

const source = new URL(process.env.DATABASE_URL);
const sourceName = decodeURIComponent(source.pathname.replace(/^\//, ''));
const scratch = 'ems_support_migration_rollback_test';
const evidencePath = join(dirname(fileURLToPath(import.meta.url)), 'migration-rollback-smoke.json');
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

try {
  if (!['localhost', '127.0.0.1', '::1'].includes(source.hostname.toLowerCase()) || sourceName !== 'ems_support_test') {
    throw new Error('Rollback smoke only accepts the ems_support_test loopback connection');
  }
  const existing = await prisma.$queryRaw`SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=${scratch}`;
  if (existing.length) throw new Error(`${scratch} already exists; refusing to overwrite it`);

  await prisma.$executeRawUnsafe(`CREATE DATABASE \`${scratch}\` CHARACTER SET utf8mb4`);
  await prisma.$executeRawUnsafe(`CREATE TABLE \`${scratch}\`.tickets (id BIGINT UNSIGNED PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL, created_at DATETIME(3) NOT NULL) ENGINE=InnoDB`);
  await prisma.$executeRawUnsafe(`ALTER TABLE \`${scratch}\`.tickets ADD COLUMN description_preview VARCHAR(200) NOT NULL DEFAULT ''`);
  await prisma.$executeRawUnsafe(`CREATE INDEX tickets_user_id_created_at_idx ON \`${scratch}\`.tickets (user_id,created_at)`);
  const before = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM \`${scratch}\`.tickets`);
  const indexesBefore = await prisma.$queryRawUnsafe(`SHOW INDEX FROM \`${scratch}\`.tickets`);

  await prisma.$executeRawUnsafe(`DROP INDEX tickets_user_id_created_at_idx ON \`${scratch}\`.tickets`);
  await prisma.$executeRawUnsafe(`ALTER TABLE \`${scratch}\`.tickets DROP COLUMN description_preview`);
  const after = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM \`${scratch}\`.tickets`);
  const indexesAfter = await prisma.$queryRawUnsafe(`SHOW INDEX FROM \`${scratch}\`.tickets`);
  const result = {
    source: `${source.hostname}/${sourceName}`,
    scratch,
    columnsBeforeRollback: before.map((row) => row.Field),
    indexesBeforeRollback: indexesBefore.map((row) => row.Key_name),
    columnsAfterRollback: after.map((row) => row.Field),
    indexesAfterRollback: indexesAfter.map((row) => row.Key_name),
    rollbackVerified: !after.some((row) => row.Field === 'description_preview') && !indexesAfter.some((row) => row.Key_name === 'tickets_user_id_created_at_idx'),
  };
  await writeFile(evidencePath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await prisma.$disconnect();
}
