import 'dotenv/config';
import { appendFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Prisma, PrismaClient } from '@prisma/client';
import { createMariaDbAdapter } from '../../dist/database/prisma/mariadb-adapter.js';

const evidencePath = join(dirname(fileURLToPath(import.meta.url)), 'search-after-owner-date-index.jsonl');
const classes = [
  { name: 'rare-term', pattern: '%RareSearchTermQzv731%' },
  { name: 'no-match', pattern: '%NoSuchTokenVq987%' },
  { name: 'common-term', pattern: '%login%' },
];
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });
const sql = (id, pattern) => Prisma.sql`
  SELECT /*+ MAX_EXECUTION_TIME(5000) */ t.id
  FROM tickets AS t
  LEFT JOIN ticket_categories AS c ON c.id=t.category_id
  LEFT JOIN ticket_sub_categories AS sc ON sc.id=t.sub_category_id
  LEFT JOIN users AS u ON u.id=t.user_id
  WHERE t.user_id=${id} AND (
    t.subject LIKE ${pattern} OR t.description LIKE ${pattern} OR t.ticket_number LIKE ${pattern}
    OR c.name LIKE ${pattern} OR sc.name LIKE ${pattern} OR u.name LIKE ${pattern} OR u.email LIKE ${pattern}
  )
  ORDER BY t.created_at DESC,t.id DESC LIMIT 21`;
const percentile = (xs, p) => [...xs].sort((a,b)=>a-b)[Math.max(0,Math.ceil(xs.length*p)-1)] ?? null;

try {
  const db = new URL(process.env.DATABASE_URL);
  if (!['localhost','127.0.0.1','::1'].includes(db.hostname.toLowerCase()) || !/(test|perf)/i.test(db.pathname)) throw new Error('Refusing non-local test/perf database');
  const [owner] = await prisma.$queryRaw`SELECT user_id FROM tickets GROUP BY user_id ORDER BY COUNT(*) DESC LIMIT 1`;
  await writeFile(evidencePath, '');
  for (const cls of classes) {
    const query = sql(owner.user_id, cls.pattern);
    const explainAnalyze = await prisma.$queryRaw(Prisma.sql`EXPLAIN ANALYZE ${query}`);
    const samples = [];
    for (let i=0;i<105;i++) {
      const start=performance.now();
      await prisma.$queryRaw(query);
      if(i>=5) samples.push(Number((performance.now()-start).toFixed(3)));
    }
    const record={role:'normal-user',class:cls.name,normalUserId:owner.user_id.toString(),warmups:5,iterations:100,explainAnalyze,timing:{p50_ms:percentile(samples,.5),p95_ms:percentile(samples,.95),max_ms:Math.max(...samples),completed:samples.length}};
    await appendFile(evidencePath,`${JSON.stringify(record,(_k,v)=>typeof v==='bigint'?v.toString():v)}\n`);
    console.log(`${cls.name} saved`);
  }
} finally { await prisma.$disconnect(); }
