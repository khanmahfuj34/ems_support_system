import 'dotenv/config';
import { appendFile, access, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Prisma, PrismaClient } from '@prisma/client';
import { createMariaDbAdapter } from '../../dist/database/prisma/mariadb-adapter.js';

const sourceDatabase = 'ems_support_test';
const scratchDatabase = 'ems_support_test_wholeword_spike';
const table = `\`${scratchDatabase}\`.\`ticket_search\``;
const dateIndex = 'idx_created_ticket';
const pageSize = 10;
const warmups = 3;
const iterations = 20;
const outputDir = dirname(fileURLToPath(import.meta.url));
const resultsPath = join(outputDir, 'admin-hybrid-resume-results.json');
const progressPath = join(outputDir, 'admin-hybrid-resume-results.jsonl');
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

const classes = {
  'no-match': { term: 'NoMatchTokenQzv947', tokens: ['nomatchtokenqzv947'], boolean: '+NoMatchTokenQzv947' },
  typo: { term: 'lgin', tokens: ['lgin'], boolean: '+lgin' },
  rare: { term: 'RareSearchTermQzv731', tokens: ['raresearchtermqzv731'], boolean: '+RareSearchTermQzv731' },
  '1,244-match': { term: 'login account email', tokens: ['login','account','email'], boolean: '+login +account +email' },
  '6,237-match': { term: 'issue problem account', tokens: ['issue','problem','account'], boolean: '+issue +problem +account' },
  '18,800-match': { term: 'login account issue', tokens: ['login','account','issue'], boolean: '+login +account +issue' },
  login: { term: 'login', tokens: ['login'], boolean: '+login' },
};

function json(v) { return JSON.stringify(v, (_k,x)=>typeof x==='bigint'?x.toString():x,2); }
function pct(xs,q) { const a=[...xs].sort((x,y)=>x-y); return a[Math.max(0,Math.ceil(a.length*q)-1)] ?? null; }
function assertLocal() {
  const u = new URL(process.env.DATABASE_URL);
  const db = decodeURIComponent(u.pathname.replace(/^\//,''));
  if (!['localhost','127.0.0.1','::1'].includes(u.hostname.toLowerCase()) || db !== sourceDatabase)
    throw new Error(`Refusing database ${u.hostname}/${db}; expected localhost/${sourceDatabase}`);
}
function dateCursor(c) {
  return c ? Prisma.sql`AND (created_at < ${c.created_at} OR (created_at = ${c.created_at} AND ticket_id < ${c.ticket_id}))` : Prisma.empty;
}
async function scan(cls, rowBudget) {
  let scanned=0, cursor=null, found=[];
  let lastScanned=null;
  while(scanned<rowBudget && found.length<pageSize+1) {
    const take=Math.min(500,rowBudget-scanned);
    const rows=await prisma.$queryRaw`SELECT /*+ MAX_EXECUTION_TIME(5000) */ ticket_id,created_at,subject,description_text
      FROM ${Prisma.raw(table)} FORCE INDEX (${Prisma.raw(dateIndex)})
      WHERE 1=1 ${dateCursor(cursor)} ORDER BY created_at DESC,ticket_id DESC LIMIT ${take}`;
    if(!rows.length) break;
    scanned+=rows.length;
    lastScanned={created_at:rows.at(-1).created_at,ticket_id:rows.at(-1).ticket_id};
    for(const row of rows) {
      const wordSet=new Set((`${row.subject}\n${row.description_text}`.toLowerCase().match(/[\p{L}\p{N}_]+/gu)??[]));
      if(cls.tokens.every(t=>wordSet.has(t))) found.push(row);
    }
    cursor=lastScanned;
    if(rows.length<take) break;
  }
  return { rows:found.slice(0,pageSize+1), scannedRows:scanned, lastScanned,
    budgetExhausted:scanned>=rowBudget && found.length<pageSize+1 };
}
async function fulltext(cls) {
  try {
    const rows=await prisma.$queryRaw`SELECT /*+ MAX_EXECUTION_TIME(500) */ ticket_id,created_at
      FROM ${Prisma.raw(table)} FORCE INDEX (ft_subject_description)
      WHERE MATCH(subject,description_text) AGAINST (${cls.boolean} IN BOOLEAN MODE)
      ORDER BY created_at DESC,ticket_id DESC LIMIT ${pageSize+1}`;
    return {rows,timedOut:false};
  } catch(e) {
    const msg=String(e?.message??e);
    if(/maximum statement execution time|execution time.*exceeded|query execution was interrupted/i.test(msg)) return {rows:[],timedOut:true};
    throw e;
  }
}
function mergeRows(a,b) {
  const map=new Map();
  for(const row of [...a,...b]) map.set(String(row.ticket_id),row);
  return [...map.values()].sort((x,y)=>{
    const dateOrder=y.created_at.getTime()-x.created_at.getTime();
    if(dateOrder) return dateOrder;
    const xi=BigInt(x.ticket_id), yi=BigInt(y.ticket_id);
    return xi===yi?0:(xi>yi?-1:1);
  }).slice(0,pageSize+1);
}
async function runDateOnly(cls) {
  const scanResult=await scan(cls,5000);
  return { rows:scanResult.rows, scannedRows:scanResult.scannedRows, lastScanned:scanResult.lastScanned, budgetExhausted:scanResult.budgetExhausted,
    hasMore:scanResult.rows.length>pageSize || scanResult.budgetExhausted, fulltextTimedOut:false, fulltextUsed:false };
}
async function runReverseHybrid(cls) {
  const scanResult=await scan(cls,2000);
  if(scanResult.rows.length>=pageSize+1) return {rows:scanResult.rows,scannedRows:scanResult.scannedRows,lastScanned:scanResult.lastScanned,
    budgetExhausted:false,hasMore:true,fulltextTimedOut:false,fulltextUsed:false};
  const f=await fulltext(cls);
  const rows=f.timedOut?scanResult.rows:mergeRows(scanResult.rows,f.rows);
  return {rows,scannedRows:scanResult.scannedRows,lastScanned:scanResult.lastScanned,budgetExhausted:scanResult.budgetExhausted,
    hasMore:f.timedOut ? (scanResult.budgetExhausted || rows.length>pageSize) : rows.length>pageSize,
    fulltextTimedOut:f.timedOut,fulltextUsed:true};
}
async function measure(name,cls,mode,fn) {
  for(let i=0;i<warmups;i++) await fn();
  const ms=[],reads=[],timeouts=[],exhausted=[],hasMore=[],matches=[],ftUsed=[];
  for(let i=0;i<iterations;i++) {
    const start=performance.now();
    const r=await fn();
    ms.push(performance.now()-start); reads.push(r.scannedRows); timeouts.push(r.fulltextTimedOut?1:0);
    exhausted.push(r.budgetExhausted?1:0); hasMore.push(r.hasMore?1:0); matches.push(r.rows.length); ftUsed.push(r.fulltextUsed?1:0);
  }
  return {name,term:cls.term,mode,warmups,measured:iterations,summary:{p50_ms:pct(ms,.5),p95_ms:pct(ms,.95),max_ms:Math.max(...ms)},
    scannedRows:{p50:pct(reads,.5),p95:pct(reads,.95),max:Math.max(...reads)},fulltextTimeouts:timeouts.reduce((a,b)=>a+b,0),
    fulltextUsedSamples:ftUsed.reduce((a,b)=>a+b,0),returnedCandidateRows:{p50:pct(matches,.5),min:Math.min(...matches),max:Math.max(...matches)},
    budgetExhaustions:exhausted.reduce((a,b)=>a+b,0),hasMoreTrueSamples:hasMore.reduce((a,b)=>a+b,0),
    responseOnBudgetExhaustion:'Return matched rows so far, hasMore:true, and lastScanned cursor; never report a definitive empty end-of-results.',latencySamplesMs:ms};
}

try {
  assertLocal();
  for(const path of [resultsPath,progressPath]) {
    try { await access(path,constants.F_OK); throw new Error(`Refusing to overwrite ${path}`); }
    catch(e) { if(e?.code!=='ENOENT') throw e; }
  }
  const [rowCount, dateIdx, ftIdx] = await Promise.all([
    prisma.$queryRaw`SELECT COUNT(*) AS n FROM ${Prisma.raw(table)}`,
    prisma.$queryRaw`SHOW INDEX FROM ${Prisma.raw(table)} WHERE Key_name=${dateIndex}`,
    prisma.$queryRaw`SHOW INDEX FROM ${Prisma.raw(table)} WHERE Key_name='ft_subject_description'`,
  ]);
  if(Number(rowCount[0].n)!==1_000_000) throw new Error(`Expected 1,000,000 scratch rows; found ${rowCount[0].n}`);
  if(!dateIdx.length || !ftIdx.length) throw new Error('Required scratch indexes are missing; refusing to build or alter schema');
  const data={sourceDatabase,scratchDatabase,scratchRows:String(rowCount[0].n),reusedIndexes:[dateIndex,'ft_subject_description'],
    criteria:'Page size 10; created_at DESC,ticket_id DESC; whole-word all-token matching; no date/status/category filters.',
    parameters:{warmups,measuredQueriesPerCase:iterations,statementCapMs:5000,fulltextCapMs:500,rowBudgets:{dateScanOnly:5000,reverseThenFulltext:2000}},results:[]};
  await writeFile(resultsPath,json(data)); await writeFile(progressPath,'');
  for(const [name,cls] of Object.entries(classes)) {
    if(['no-match','typo','6,237-match','18,800-match'].includes(name)) {
      const r=await measure(name,cls,'date-scan-only-5000',()=>runDateOnly(cls));
      data.results.push(r); await appendFile(progressPath,JSON.stringify(r)+'\n'); await writeFile(resultsPath,json(data));
      console.log(`${name} date-scan-only p95=${r.summary.p95_ms} ms`);
    }
    if(['no-match','rare','1,244-match','6,237-match','login'].includes(name)) {
      const r=await measure(name,cls,'date-scan-2000-then-fulltext-500',()=>runReverseHybrid(cls));
      data.results.push(r); await appendFile(progressPath,JSON.stringify(r)+'\n'); await writeFile(resultsPath,json(data));
      console.log(`${name} reverse-hybrid p95=${r.summary.p95_ms} ms FT timeouts=${r.fulltextTimeouts}`);
    }
  }
} finally { await prisma.$disconnect(); }
