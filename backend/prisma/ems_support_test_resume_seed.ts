import 'dotenv/config';
import { PrismaClient, Priority } from '@prisma/client';
import { createMariaDbAdapter } from '../src/database/prisma/mariadb-adapter.js';

const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });
const BATCH = 1000;
const TOTAL_USERS = 100_000;
const TOTAL_TICKETS = 250_000;
const FIRST_MISSING_TICKET_ID = 99_001;

function dateAt(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}
function pick<T>(arr: T[], n: number): T {
  return arr[n % arr.length];
}
async function insertGenerated<T>(
  total: number,
  build: (id: number) => T,
  insert: (rows: T[]) => Promise<unknown>,
  label: string,
) {
  for (let start = 1; start <= total; start += BATCH) {
    const end = Math.min(start + BATCH - 1, total);
    const rows: T[] = [];
    for (let id = start; id <= end; id++) rows.push(build(id));
    await insert(rows);
    if (start % 50_000 === 1 || end === total) console.log(`${label}: ${end}/${total}`);
  }
}

async function main() {
  const db = await prisma.$queryRaw<Array<{ db_name: string }>>`SELECT DATABASE() AS db_name`;
  if (db[0]?.db_name !== 'ems_support_test') {
    throw new Error(`Safety stop: connected database is "${db[0]?.db_name}", expected "ems_support_test".`);
  }

  const [users, tickets, categories, subCategories, comments, attachments, notes, histories, activities, notifications, auditLogs] =
    await Promise.all([
      prisma.user.count(), prisma.ticket.count(), prisma.ticketCategory.count(),
      prisma.ticketSubCategory.count(), prisma.ticketComment.count(), prisma.ticketAttachment.count(),
      prisma.ticketInternalNote.count(), prisma.ticketStatusHistory.count(), prisma.ticketActivityLog.count(),
      prisma.notification.count(), prisma.auditLog.count(),
    ]);

  // This resume script is deliberately strict: only continue from the exact known partial state.
  if (users !== TOTAL_USERS || tickets !== 99_000 || categories !== 5 || subCategories !== 15 ||
      comments !== 0 || attachments !== 0 || notes !== 0 || histories !== 0 ||
      activities !== 0 || notifications !== 0 || auditLogs !== 0) {
    throw new Error(
      `Safety stop: unexpected current counts. users=${users}, tickets=${tickets}, categories=${categories}, subCategories=${subCategories}, comments=${comments}, attachments=${attachments}, notes=${notes}, histories=${histories}, activities=${activities}, notifications=${notifications}, auditLogs=${auditLogs}. ` +
      'This script only resumes from 100,000 users, 99,000 tickets, 5 categories, 15 subcategories, and empty related tables.'
    );
  }

  const roles = await prisma.userRole.count();
  const statuses = await prisma.ticketStatus.count();
  const policiesCount = await prisma.slaPolicy.count();
  if (roles !== 2 || statuses !== 9 || policiesCount !== 4) {
    throw new Error(`Safety stop: lookup rows mismatch (roles=${roles}, statuses=${statuses}, SLA policies=${policiesCount}). Run the normal lookup seed first.`);
  }

  console.log('Safety checks passed. Preserving existing users and 99,000 tickets.');
  const slaRows = await prisma.slaPolicy.findMany({ select: { id: true, priority: true } });
  const slaIdByPriority = new Map(slaRows.map((s) => [s.priority, s.id]));
  const categoryIds = [1, 2, 3, 4, 5];
  const subCategoryIds = Array.from({ length: 15 }, (_, i) => i + 1);
  const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL];
  const subjects = [
    'Unable to sign in', 'Payment was not completed', 'Page is loading slowly',
    'Need help with my account', 'Unexpected application error', 'Request for refund',
    'Email verification link expired', 'Need assistance with a service',
  ];
  const descriptions = [
    'This is generated test content for database load testing. No real customer data is included.',
    'Mock support request created to test filtering, pagination, and search performance.',
    'Load-test ticket: please investigate the described issue in this non-production dataset.',
  ];

  console.log(`Creating missing tickets ${FIRST_MISSING_TICKET_ID}-${TOTAL_TICKETS}...`);
  for (let start = FIRST_MISSING_TICKET_ID; start <= TOTAL_TICKETS; start += BATCH) {
    const end = Math.min(start + BATCH - 1, TOTAL_TICKETS);
    const rows = [];
    for (let id = start; id <= end; id++) {
      const priority = pick(priorities, id);
      const statusId = (id % 9) + 1;
      const createdAt = dateAt(id % 730);
      rows.push({
        id: BigInt(id),
        ticketNumber: `TST-${String(id).padStart(8, '0')}`,
        userId: BigInt(((id - 1) % (TOTAL_USERS - 100)) + 101),
        categoryId: BigInt(pick(categoryIds, id)),
        subCategoryId: BigInt(pick(subCategoryIds, id)),
        slaPolicyId: slaIdByPriority.get(priority) ?? null,
        subject: `${pick(subjects, id)} #${id}`,
        description: pick(descriptions, id),
        userPriority: priority,
        adminPriority: id % 3 === 0 ? pick(priorities, id + 1) : null,
        statusId,
        rejectionReason: statusId === 8 ? 'Generated mock rejection reason.' : null,
        resolutionSummary: statusId === 6 || statusId === 7 ? 'Generated mock resolution summary.' : null,
        firstResponseAt: id % 4 === 0 ? new Date(createdAt.getTime() + 15 * 60 * 1000) : null,
        firstResponseDueAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
        resolutionDueAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
        slaStatus: (id % 4) + 1,
        resolvedAt: statusId === 6 || statusId === 7 ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) : null,
        closedAt: statusId === 7 ? new Date(createdAt.getTime() + 3 * 60 * 60 * 1000) : null,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
      });
    }
    await prisma.ticket.createMany({ data: rows });
    if ((start - FIRST_MISSING_TICKET_ID) % 10_000 === 0 || end === TOTAL_TICKETS) {
      console.log(`Tickets: ${end}/${TOTAL_TICKETS}`);
    }
  }

  const TOTAL_COMMENTS = 300_000;
  const TOTAL_ATTACHMENTS = 20_000;
  const TOTAL_NOTES = 15_000;
  const TOTAL_HISTORY = 200_000;
  const TOTAL_ACTIVITIES = 120_000;
  const TOTAL_NOTIFICATIONS = 50_000;
  const TOTAL_AUDIT = 45_000;
  const tId = (id: number) => BigInt(((id - 1) % TOTAL_TICKETS) + 1);
  const uId = (id: number) => BigInt(((id - 1) % TOTAL_USERS) + 1);
  const adminId = (id: number) => BigInt(((id - 1) % 100) + 1);

  console.log('Creating 300,000 comments...');
  await insertGenerated(TOTAL_COMMENTS, id => ({
    id: BigInt(id), ticketId: tId(id), userId: uId(id),
    content: `Mock comment ${id}: generated content for load testing.`,
    createdAt: dateAt(id % 730), updatedAt: dateAt(id % 365),
  }), rows => prisma.ticketComment.createMany({ data: rows }), 'Comments');

  console.log('Creating 20,000 attachments...');
  await insertGenerated(TOTAL_ATTACHMENTS, id => ({
    id: BigInt(id), ticketId: tId(id), uploadedBy: uId(id),
    fileName: `mock-attachment-${id}.txt`,
    fileUrl: `https://example.test/mock-attachments/${id}.txt`,
    cloudinaryPublicId: null, mimeType: 'text/plain', fileSize: BigInt(1024 + (id % 100000)),
    resourceType: 'raw', createdAt: dateAt(id % 730),
  }), rows => prisma.ticketAttachment.createMany({ data: rows }), 'Attachments');

  console.log('Creating 15,000 internal notes...');
  await insertGenerated(TOTAL_NOTES, id => ({
    id: BigInt(id), ticketId: tId(id), adminId: adminId(id),
    content: `Internal mock admin note ${id}. Do not use for production.`,
    createdAt: dateAt(id % 730), updatedAt: dateAt(id % 365),
  }), rows => prisma.ticketInternalNote.createMany({ data: rows }), 'Internal notes');

  console.log('Creating 200,000 status-history records...');
  await insertGenerated(TOTAL_HISTORY, id => ({
    id: BigInt(id), ticketId: tId(id), changedBy: adminId(id),
    oldStatusId: id % 9 === 0 ? null : ((id - 1) % 9) + 1,
    newStatusId: (id % 9) + 1,
    reason: `Generated status transition ${id}`,
    createdAt: dateAt(id % 730),
  }), rows => prisma.ticketStatusHistory.createMany({ data: rows }), 'Status history');

  console.log('Creating 120,000 activity logs...');
  await insertGenerated(TOTAL_ACTIVITIES, id => ({
    id: BigInt(id), ticketId: tId(id), actorId: adminId(id),
    action: pick(['TICKET_UPDATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'COMMENT_ADDED'], id),
    oldValue: { generated: true, sequence: id - 1 },
    newValue: { generated: true, sequence: id },
    metadata: { source: 'load-test', sequence: id },
    createdAt: dateAt(id % 730),
  }), rows => prisma.ticketActivityLog.createMany({ data: rows }), 'Activity logs');

  console.log('Creating 50,000 notifications...');
  await insertGenerated(TOTAL_NOTIFICATIONS, id => ({
    id: BigInt(id), userId: uId(id), ticketId: tId(id),
    title: `Mock notification ${id}`, message: `Generated notification for load testing: ${id}`,
    type: pick(['TICKET_UPDATE', 'COMMENT', 'STATUS_CHANGE'], id),
    isRead: id % 2 === 0, createdAt: dateAt(id % 730),
  }), rows => prisma.notification.createMany({ data: rows }), 'Notifications');

  console.log('Creating 45,000 audit logs...');
  await insertGenerated(TOTAL_AUDIT, id => ({
    id: BigInt(id), actorId: id % 10 === 0 ? null : adminId(id),
    action: pick(['CREATE', 'UPDATE', 'STATUS_CHANGE', 'COMMENT'], id),
    entity: pick(['ticket', 'user', 'comment'], id),
    entityId: BigInt(((id - 1) % TOTAL_TICKETS) + 1),
    oldValue: { generated: true, version: id - 1 },
    newValue: { generated: true, version: id },
    ipAddress: `192.0.2.${(id % 254) + 1}`,
    userAgent: 'EMS-Support-Load-Test/1.0',
    createdAt: dateAt(id % 730),
  }), rows => prisma.auditLog.createMany({ data: rows }), 'Audit logs');

  console.log('Resume seed completed successfully.');
  console.log('Expected final counts: users=100000, tickets=250000, comments=300000, attachments=20000, notes=15000, history=200000, activity=120000, notifications=50000, audit=45000.');
}

main()
  .catch(error => {
    console.error('Resume seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
