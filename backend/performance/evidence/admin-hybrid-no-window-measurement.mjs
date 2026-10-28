import 'dotenv/config';
import { appendFile, access, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Prisma, PrismaClient } from '@prisma/client';
import { createMariaDbAdapter } from '../../dist/database/prisma/mariadb-adapter.js';

// Measurement harness only. Never accesses production and never changes application code.
const sourceDatabase = 'ems_support_test';
const scratchDatabase = 'ems_support_test_wholeword_spike';
const table = `\`${scratchDatabase}\`.\`ticket_search\``;
const indexName = 'idx_created_ticket';
const dir = dirname(fileURLToPath(import.meta.url));
const resultsPath = join(dir, 'admin-hybrid-no-window-results.json');
const progressPath = join(dir, 'admin-hybrid-no-window-progress.jsonl');
const iterations = Number(process.env.MEASURE_ITERATIONS ?? 100);
const warmups = Number(process.env.MEASURE_WARMUPS ?? 5);
const pageSize = 10;
const scanBudget = Number(process.env.MEASURE_SCAN_BUDGET ?? 5000);
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

function assertLocal() {
  const u = new URL(process.env.DATABASE_URL);
  const db = decodeURIComponent(u.pathname.replace(/^\//, ''));
  if (!['localhost', '127.0.0.1', '::1'].includes(u.hostname.toLowerCase()) || db !== sourceDatabase) {
    throw new Error(`Refusing DB ${u.hostname}/${db}; expected localhost/${sourceDatabase}`);
  }
}
function quantile(a, q) { const s = [...a].sort((x,y)=>x-y); return s[Math.max(0,Math.ceil(s.length*q)-1)] ?? null; }
function json(value) { return JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item, 2); }
function escReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function candidateQuery(cls, filter, cursor, timeoutMs, explain = false) {
  const against = cls.prefix ? `+${cls.term}*` : cls.booleanQuery;
  const after = cursor ? Prisma.sql`AND (created_at < ${cursor.created_at} OR (created_at = ${cursor.created_at} AND ticket_id < ${cursor.ticket_id}))` : Prisma.empty;
  const where = Prisma.sql`${filter.sql} ${after}`;
  const select = explain ? Prisma.raw('EXPLAIN ANALYZE') : Prisma.empty;
  return Prisma.sql`${select} SELECT /*+ MAX_EXECUTION_TIME(${Prisma.raw(String(timeoutMs))}) */ ticket_id, created_at
    FROM ${Prisma.raw(table)} FORCE INDEX (ft_subject_description)
    WHERE MATCH(subject, description_text) AGAINST (${against} IN BOOLEAN MODE) ${where}
    ORDER BY created_at DESC, ticket_id DESC LIMIT ${pageSize + 1}`;
}
function filterFor(ctx) {
  if (!ctx.statusId) return { sql: Prisma.empty, label: 'all' };
  return { sql: Prisma.sql`AND status_id = ${ctx.statusId} AND category_id = ${ctx.categoryId}`, label: `${ctx.statusId}:${ctx.categoryId}`, statusId: Number(ctx.statusId), categoryId: Number(ctx.categoryId) };
}
function cursorClause(cursor) {
  return cursor ? Prisma.sql`AND (created_at < ${cursor.created_at} OR (created_at = ${cursor.created_at} AND ticket_id < ${cursor.ticket_id}))` : Prisma.empty;
}
function dateBatch(cls, filter, cursor, limit) {
  const f = filter.sql;
  return Prisma.sql`SELECT /*+ MAX_EXECUTION_TIME(5000) */ ticket_id, created_at, status_id, category_id, subject, description_text
    FROM ${Prisma.raw(table)} FORCE INDEX (${Prisma.raw(indexName)})
    WHERE 1=1 ${cursorClause(cursor)}
    ORDER BY created_at DESC, ticket_id DESC LIMIT ${limit}`;
}
async function dateScan(cls, filter, initialCursor, explain = false) {
  let cursor = initialCursor;
  let read = 0;
  let found = [];
  let lastScanned = cursor;
  const tokens = cls.tokens;
  const wordRe = cls.prefix ? new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escReg(tokens[0])}[\\p{L}\\p{N}_]*`, 'iu') : null;
  if (explain) {
    const q = dateBatch(cls, filter, cursor, Math.min(scanBudget, 10000));
    const e = await prisma.$queryRaw(Prisma.sql`EXPLAIN ANALYZE ${q}`);
    return { explain: e[0]?.['EXPLAIN ANALYZE'] ?? e[0]?.EXPLAIN ?? String(e[0]), rowsRead: null };
  }
  while (read < scanBudget && found.length < pageSize + 1) {
    const take = Math.min(500, scanBudget - read);
    const rows = await prisma.$queryRaw(dateBatch(cls, filter, cursor, take));
    if (!rows.length) break;
    read += rows.length;
    lastScanned = { created_at: rows.at(-1).created_at, ticket_id: rows.at(-1).ticket_id };
    for (const row of rows) {
      const words = new Set((`${row.subject}\n${row.description_text}`.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? []));
      const passesFilter = !filter.statusId || (Number(row.status_id) === filter.statusId && Number(row.category_id) === filter.categoryId);
      const matched = passesFilter && (cls.prefix ? wordRe.test(`${row.subject}\n${row.description_text}`) : tokens.every(token => words.has(token)));
      if (matched) found.push(row);
    }
    cursor = lastScanned;
    if (rows.length < take) break;
  }
  return { rows: found.slice(0, pageSize + 1), rowsRead: read, lastScanned, budgetExhausted: read >= scanBudget && found.length < pageSize + 1 };
}
async function runOne(mode, timeoutMs, cls, filter, cursor) {
  const started = performance.now();
  let timedOut = false;
  let result;
  try {
    if (mode === 'date-scan') result = await dateScan(cls, filter, cursor);
    else {
      try {
        const rows = await prisma.$queryRaw(candidateQuery(cls, filter, cursor, timeoutMs));
        result = { rows, rowsRead: null, fellBack: false };
      } catch (e) {
        if (!/maximum statement execution time|execution time.*exceeded|query execution was interrupted/i.test(String(e?.message))) throw e;
        timedOut = true;
        if (mode === 'hybrid') result = { ...(await dateScan(cls, filter, cursor)), fellBack: true };
        else result = { rows: [], rowsRead: null, timedOut: true };
      }
      if (mode === 'hybrid' && !timedOut) result.fellBack = false;
    }
    const ms = performance.now() - started;
    return { ms, timedOut, count: result.rows?.length ?? 0, rowsRead: result.rowsRead, fellBack: !!result.fellBack, budgetExhausted: !!result.budgetExhausted,
      hasMore: (result.rows?.length ?? 0) > pageSize || !!result.budgetExhausted,
      cursor: result.lastScanned ? { created_at: result.lastScanned.created_at, ticket_id: String(result.lastScanned.ticket_id) } : null };
  } catch (e) {
    return { ms: performance.now() - started, error: String(e?.message ?? e), timedOut, rowsRead: null };
  }
}

try {
  assertLocal();
  try { await access(resultsPath, constants.F_OK); throw new Error(`Refusing to overwrite ${resultsPath}`); }
  catch (e) { if (e?.code !== 'ENOENT') throw e; }
  const [count] = await prisma.$queryRaw`SELECT COUNT(*) AS n FROM ${Prisma.raw(table)}`;
  if (Number(count.n) !== 1_000_000) throw new Error(`Scratch data has ${count.n} rows, expected 1,000,000`);
  const [vars] = await prisma.$queryRaw`SELECT @@innodb_ft_min_token_size AS min_token_size, @@innodb_ft_enable_stopword AS stopwords`;
  const pairs = await prisma.$queryRaw`SELECT status_id, category_id, COUNT(*) AS n FROM ${Prisma.raw(table)} GROUP BY status_id,category_id ORDER BY n DESC LIMIT 3`;
  const indexStarted = performance.now();
  await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD INDEX ${indexName} (created_at, ticket_id)`);
  const dateIndexBuildMs = performance.now() - indexStarted;
  const indexStats = await prisma.$queryRaw`SELECT index_name, stat_name, stat_value FROM mysql.innodb_index_stats WHERE database_name=${scratchDatabase} AND table_name='ticket_search' AND index_name IN ('ft_subject_description','${indexName}') AND stat_name='size'`;
  const fulltextSpaces = await prisma.$queryRaw`SELECT NAME, FILE_SIZE FROM information_schema.INNODB_TABLESPACES WHERE NAME LIKE ${`${scratchDatabase}/fts%_index_%`}`;
  const fulltextIndexBytes = fulltextSpaces.reduce((sum, row) => sum + Number(row.FILE_SIZE), 0);
  const tokenProbes = [];
  for (const query of ['+the','+to','+of','+an','+ab','+log*']) {
    const [probe] = await prisma.$queryRaw`SELECT /*+ MAX_EXECUTION_TIME(5000) */ COUNT(*) AS n FROM ${Prisma.raw(table)} FORCE INDEX (ft_subject_description) WHERE MATCH(subject,description_text) AGAINST (${query} IN BOOLEAN MODE)`;
    tokenProbes.push({booleanQuery:query,candidateRows:String(probe.n)});
  }
  const defaultStopwords = await prisma.$queryRaw`SELECT value FROM information_schema.INNODB_FT_DEFAULT_STOPWORD WHERE value IN ('the','to','of','an')`;
  const terms = [
    { name:'no-match', term:'NoMatchTokenQzv947', tokens:['nomatchtokenqzv947'] },
    { name:'typo', term:'lgin', tokens:['lgin'] },
    { name:'rare', term:'RareSearchTermQzv731', tokens:['raresearchtermqzv731'] },
    { name:'mid-0.1%', term:'login account email', tokens:['login','account','email'] },
    { name:'mid-0.5%', term:'issue problem account', tokens:['issue','problem','account'] },
    { name:'mid-2%', term:'login account issue', tokens:['login','account','issue'] },
    { name:'common', term:'login', tokens:['login'] }, { name:'prefix', term:'pass', tokens:['pass'], prefix:true },
  ].map(cls=>({...cls, booleanQuery:cls.prefix?`+${cls.term}*`:cls.tokens.map(t=>`+${t}`).join(' ')}));
  const contexts = [{ name:'unfiltered' }, ...pairs.map(p=>({name:`status-${p.status_id}-category-${p.category_id}`,statusId:p.status_id,categoryId:p.category_id}))];
  const out = { sourceDatabase, scratchDatabase, scratchRows:String(count.n), measurement:'DB-only scratch measurement; no application code changed; no date window; page size 10; created_at DESC,id DESC; whole-word regex or word prefix. Date scan walks the date/id index in batches and applies status/category plus text predicates in the harness, enforcing the row budget exactly.', mysql:await prisma.$queryRaw`SELECT VERSION() AS version, @@version_comment AS version_comment`, innodbFulltext:{...vars, defaultStopwords:defaultStopwords.map(r=>r.value), tokenProbes, hybridUserVisibleBehavior:'A stopword-only or shorter-than-minimum query returns no FULLTEXT candidates and does not time out; under this measured hybrid rule it does not fall back to the date scan, so the user sees HTTP 200 with empty data.'}, fulltextIndexBuildMs:301306.3, fulltextIndexBuildEvidence:'whole-word-window-results.json, built on this exact 1M-row scratch copy', fulltextIndexBytes, fulltextIndexSpaces:fulltextSpaces.map(r=>({name:r.NAME,bytes:String(r.FILE_SIZE)})), dateIndexBuildMs, indexStats, topStatusCategoryPairs:pairs.map(p=>({statusId:String(p.status_id),categoryId:String(p.category_id),rows:String(p.n)})), scanBudgetRows:scanBudget, warmups, iterations, classes:[], results:[] };
  await writeFile(resultsPath, json(out));
  await writeFile(progressPath, '');
  // Counts are measured with exact whole-word predicates before timing runs.
  for (const cls of terms) {
    const [r] = await prisma.$queryRaw`SELECT /*+ MAX_EXECUTION_TIME(5000) */ COUNT(*) AS n FROM ${Prisma.raw(table)} FORCE INDEX (ft_subject_description) WHERE MATCH(subject,description_text) AGAINST (${cls.booleanQuery} IN BOOLEAN MODE)`;
    cls.actualMatchCount = String(r.n);
  }
  out.classes = terms.map(({name,term,prefix,actualMatchCount})=>({name,term,prefix:!!prefix,actualMatchCount}));
  await writeFile(resultsPath, json(out));
  const modes = [{mode:'fulltext-only',timeout:200},{mode:'fulltext-only',timeout:500},{mode:'date-scan',timeout:5000},{mode:'hybrid',timeout:200},{mode:'hybrid',timeout:500}];
  for (const context of contexts) for (const cls of terms) {
    const filter = filterFor(context);
    for (const page of [1,5]) {
    // Establish a real keyset cursor for page 5 using the exact date-scan semantics.
    let cursor = null;
    if (page === 5) {
      const [hit] = await prisma.$queryRaw`SELECT /*+ MAX_EXECUTION_TIME(5000) */ COUNT(*) AS n FROM ${Prisma.raw(table)} FORCE INDEX (ft_subject_description) WHERE MATCH(subject,description_text) AGAINST (${cls.booleanQuery} IN BOOLEAN MODE) ${filter.sql}`;
      if (Number(hit.n) === 0) {
        const [tail] = await prisma.$queryRaw`SELECT created_at,ticket_id FROM ${Prisma.raw(table)} ORDER BY created_at ASC,ticket_id ASC LIMIT 1`;
        cursor = tail ?? null;
      } else {
        let matched = 0, scanned = 0, rounds = 0;
        while (matched < pageSize*4 && scanned < 1_000_000 && rounds++ < 250) {
          const next = await dateScan(cls, filter, cursor);
          const rows = next.rows ?? [];
          if (rows.length > pageSize) {
            matched += pageSize;
            cursor = {created_at:rows[pageSize-1].created_at,ticket_id:rows[pageSize-1].ticket_id};
          } else {
            matched += rows.length;
            scanned += next.rowsRead ?? 0;
            if (next.budgetExhausted) cursor = next.lastScanned;
            else if (rows.length) cursor = {created_at:rows.at(-1).created_at,ticket_id:rows.at(-1).ticket_id};
            else break;
          }
          if (!next.rowsRead) break;
        }
      }
    }
    for (const spec of modes) {
    const samples=[]; const scanReads=[]; let timeouts=0, fallbacks=0, exhausted=0, hasMoreCount=0, errors=[];
    for(let i=0;i<warmups;i++) await runOne(spec.mode,spec.timeout,cls,filter,cursor);
    for(let i=0;i<iterations;i++) {
      const x=await runOne(spec.mode,spec.timeout,cls,filter,cursor);
      if(x.error)errors.push(x.error); if(x.timedOut)timeouts++; if(x.fellBack)fallbacks++; if(x.budgetExhausted)exhausted++; if(x.hasMore)hasMoreCount++; if(Number.isFinite(x.rowsRead))scanReads.push(x.rowsRead);
      if(Number.isFinite(x.ms))samples.push(x.ms);
    }
    let explain;
    try {
      if(spec.mode==='date-scan') explain=(await dateScan(cls,filter,cursor,true)).explain;
      else explain=(await prisma.$queryRaw(candidateQuery(cls,filter,cursor,spec.timeout,true)))[0]?.['EXPLAIN ANALYZE'];
    } catch(e) { explain=String(e?.message??e); }
    const row={context:context.name,class:cls.name,term:cls.term,actualMatchCount:cls.actualMatchCount,page,mode:spec.mode,timeoutMs:spec.timeout,summary:{completed:samples.length,p50_ms:quantile(samples,.5),p95_ms:quantile(samples,.95),max_ms:samples.length?Math.max(...samples):null},latencySamplesMs:samples,timeouts,fallbacks,budgetExhaustions:exhausted,hasMoreTrueSamples:hasMoreCount,scanRowsRead:scanReads.length?{min:Math.min(...scanReads),p50:quantile(scanReads,.5),p95:quantile(scanReads,.95),max:Math.max(...scanReads)}:null,hasMorePolicy:'limit+1 implies true; row-budget exhaustion before page completion implies true with lastScanned cursor',errors:errors.slice(0,3),cursor:cursor?{created_at:cursor.created_at,ticket_id:String(cursor.ticket_id)}:null,explainAnalyze:explain};
    out.results.push(row);
    await appendFile(progressPath,JSON.stringify(row)+'\n');
    await writeFile(resultsPath,json(out));
    console.log(`${context.name} ${cls.name} page${page} ${spec.mode}/${spec.timeout}: p95=${row.summary.p95_ms} ms timeouts=${timeouts} fallback=${fallbacks}`);
    }
  }
  }
} finally { await prisma.$disconnect(); }
