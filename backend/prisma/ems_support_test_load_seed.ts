import 'dotenv/config';
import { PrismaClient, Priority } from '@prisma/client';
import { createMariaDbAdapter } from '../src/database/prisma/mariadb-adapter.js';

const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

const BATCH = 1000;
const TOTAL_USERS = 100_000;
const TOTAL_TICKETS = 250_000;

function chunks<T>(items: T[], size = BATCH): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
function dateAt(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}
function pick<T>(arr: T[], n: number): T {
  return arr[n % arr.length];
}

async function main() {
  // Guard against accidentally filling the real database or duplicating a previous run.
  const db = await prisma.$queryRaw<Array<{ db_name: string }>>`SELECT DATABASE() AS db_name`;
  if (db[0]?.db_name !== 'ems_support_test') {
    throw new Error(`Safety stop: connected database is "${db[0]?.db_name}", expected "ems_support_test".`);
  }

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.ticket.count(),
    prisma.ticketComment.count(),
    prisma.ticketAttachment.count(),
    prisma.ticketInternalNote.count(),
    prisma.ticketStatusHistory.count(),
    prisma.ticketActivityLog.count(),
    prisma.notification.count(),
    prisma.auditLog.count(),
    prisma.ticketCategory.count(),
  ]);
  if (counts.some((n) => n > 0)) {
    throw new Error(`Safety stop: expected an empty test dataset. Current counts (users,tickets,comments,attachments,notes,history,activity,notifications,audit,categories): ${counts.join(',')}`);
  }

  // Lookup rows are idempotently created/updated, same as prisma/seed.ts.
  for (const r of [{ id: 1, name: 'USER' }, { id: 2, name: 'ADMIN' }]) {
    await prisma.userRole.upsert({ where: { id: r.id }, update: { name: r.name }, create: r });
  }
  const statuses = [
    { id: 1, name: 'OPEN' }, { id: 2, name: 'PENDING_REVIEW' },
    { id: 3, name: 'ACCEPTED' }, { id: 4, name: 'IN_PROGRESS' },
    { id: 5, name: 'WAITING_FOR_USER' }, { id: 6, name: 'RESOLVED' },
    { id: 7, name: 'CLOSED' }, { id: 8, name: 'REJECTED' },
    { id: 9, name: 'REOPENED' },
  ];
  for (const s of statuses) {
    await prisma.ticketStatus.upsert({ where: { id: s.id }, update: { name: s.name }, create: s });
  }
  const policies = [
    { priority: Priority.CRITICAL, firstResponseMinutes: 15, resolutionMinutes: 120 },
    { priority: Priority.HIGH, firstResponseMinutes: 30, resolutionMinutes: 240 },
    { priority: Priority.MEDIUM, firstResponseMinutes: 120, resolutionMinutes: 720 },
    { priority: Priority.LOW, firstResponseMinutes: 480, resolutionMinutes: 2880 },
  ];
  for (const s of policies) {
    await prisma.slaPolicy.upsert({
      where: { priority: s.priority },
      update: { firstResponseMinutes: s.firstResponseMinutes, resolutionMinutes: s.resolutionMinutes },
      create: s,
    });
  }

  console.log('Creating categories...');
  const categoryNames = ['Account & Login', 'Payments', 'Technical Issue', 'Orders & Services', 'General Inquiry'];
  for (let i = 0; i < categoryNames.length; i++) {
    await prisma.ticketCategory.create({
      data: {
        id: BigInt(i + 1), name: categoryNames[i],
        description: `Mock category: ${categoryNames[i]}`, isActive: true, sortOrder: i + 1,
      },
    });
  }
  const subNames = [
    ['Password Reset', 'Email Verification', 'Account Access'],
    ['Failed Payment', 'Refund Request', 'Invoice Issue'],
    ['Application Error', 'Performance Issue', 'Bug Report'],
    ['Order Status', 'Cancellation', 'Service Request'],
    ['Feedback', 'Other Question', 'Information Request'],
  ];
  const subRows: any[] = [];
  let subId = 1;
  for (let c = 1; c <= categoryNames.length; c++) {
    for (const name of subNames[c - 1]) {
      subRows.push({
        id: BigInt(subId++), categoryId: BigInt(c), name,
        description: `Mock subcategory: ${name}`, isActive: true, sortOrder: subId,
      });
    }
  }
  await prisma.ticketSubCategory.createMany({ data: subRows });

  console.log('Creating 100,000 users in batches...');
  const password = '$2b$10$7EqJtq98hPqEX7fNZaFWoO5u7YvQw6u5lq6JgYJk5dZ4dKfKzYj8e'; // placeholder bcrypt-shaped hash; mock accounts may not authenticate
  for (let start = 1; start <= TOTAL_USERS; start += BATCH) {
    const end = Math.min(start + BATCH - 1, TOTAL_USERS);
    const rows = [];
    for (let id = start; id <= end; id++) {
      rows.push({
        id: BigInt(id),
        name: `Test User ${String(id).padStart(6, '0')}`,
        email: `loadtest.user${id}@example.test`,
        password,
        roleId: id <= 100 ? 2 : 1,
        isActive: true,
        emailVerifiedAt: dateAt(id % 365),
        lastLoginAt: id % 5 === 0 ? null : dateAt(id % 30),
        createdAt: dateAt(id % 730),
        updatedAt: dateAt(id % 30),
      });
    }
    await prisma.user.createMany({ data: rows });
    if (start % 10000 === 1) console.log(`Users: ${end}/${TOTAL_USERS}`);
  }

  const slaIds = await prisma.slaPolicy.findMany({ select: { id: true, priority: true } });
  const slaIdByPriority = new Map(slaIds.map((s) => [s.priority, s.id]));
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

  console.log('Creating 250,000 tickets in batches...');
  for (let start = 99001; start <= TOTAL_TICKETS; start += BATCH) {
    const end = Math.min(start + BATCH - 1, TOTAL_TICKETS);
    const rows = [];
    for (let id = start; id <= end; id++) {
      const priority = pick(priorities, id);
      const statusId = (id % 9) + 1;
      const createdAt = dateAt(id % 730);
      rows.push({
        id: BigInt(id),
        ticketNumber: `TST-${String(id).padStart(8, '0')}`,
        userId: BigInt(((id - 1) % (TOTAL_USERS - 100)) + 101), // user-role records are mostly USER
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
    if (start % 10000 === 1) console.log(`Tickets: ${end}/${TOTAL_TICKETS}`);
  }

  console.log('Creating related records...');
  const ticketIds = Array.from({ length: TOTAL_TICKETS }, (_, i) => BigInt(i + 1));
  const userIds = Array.from({ length: TOTAL_USERS }, (_, i) => BigInt(i + 1));
  const adminIds = Array.from({ length: 100 }, (_, i) => BigInt(i + 1));
  const statusHistory = [];
  const comments = [];
  const internalNotes = [];
  const attachments = [];
  const activities = [];
  const notifications = [];
  const auditLogs = [];

  // Exact requested counts: comments 300k, notes 15k, attachments 20k,
  // status history 200k, activity 120k, notifications 50k, audit logs 45k.
  // Generate each table in chunks to avoid holding millions of objects in memory.
  async function insertGenerated<T>(total: number, build: (id: number) => T, insert: (rows: T[]) => Promise<unknown>, label: string) {
    for (let start = 1; start <= total; start += BATCH) {
      const end = Math.min(start + BATCH - 1, total);
      const rows: T[] = [];
      for (let id = start; id <= end; id++) rows.push(build(id));
      await insert(rows);
      if (start % 50000 === 1) console.log(`${label}: ${end}/${total}`);
    }
  }
  const tId = (id: number) => BigInt(((id - 1) % TOTAL_TICKETS) + 1);
  const uId = (id: number) => BigInt(((id - 1) % TOTAL_USERS) + 1);
  const adminId = (id: number) => BigInt(((id - 1) % 100) + 1);

  await insertGenerated(300_000, id => ({
    id: BigInt(id), ticketId: tId(id), userId: uId(id),
    content: `Mock comment ${id}: generated content for load testing.`,
    createdAt: dateAt(id % 730), updatedAt: dateAt(id % 365),
  }), rows => prisma.ticketComment.createMany({ data: rows }), 'Comments');

  await insertGenerated(20_000, id => ({
    id: BigInt(id), ticketId: tId(id), uploadedBy: uId(id),
    fileName: `mock-attachment-${id}.txt`,
    fileUrl: `https://example.test/mock-attachments/${id}.txt`,
    cloudinaryPublicId: null, mimeType: 'text/plain', fileSize: BigInt(1024 + (id % 100000)),
    resourceType: 'raw', createdAt: dateAt(id % 730),
  }), rows => prisma.ticketAttachment.createMany({ data: rows }), 'Attachments');

  await insertGenerated(15_000, id => ({
    id: BigInt(id), ticketId: tId(id), adminId: adminId(id),
    content: `Internal mock admin note ${id}. Do not use for production.`,
    createdAt: dateAt(id % 730), updatedAt: dateAt(id % 365),
  }), rows => prisma.ticketInternalNote.createMany({ data: rows }), 'Internal notes');

  await insertGenerated(200_000, id => ({
    id: BigInt(id), ticketId: tId(id), changedBy: adminId(id),
    oldStatusId: id % 9 === 0 ? null : ((id - 1) % 9) + 1,
    newStatusId: (id % 9) + 1,
    reason: `Generated status transition ${id}`,
    createdAt: dateAt(id % 730),
  }), rows => prisma.ticketStatusHistory.createMany({ data: rows }), 'Status history');

  await insertGenerated(120_000, id => ({
    id: BigInt(id), ticketId: tId(id), actorId: adminId(id),
    action: pick(['TICKET_UPDATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'COMMENT_ADDED'], id),
    oldValue: { generated: true, sequence: id - 1 },
    newValue: { generated: true, sequence: id },
    metadata: { source: 'load-test', sequence: id },
    createdAt: dateAt(id % 730),
  }), rows => prisma.ticketActivityLog.createMany({ data: rows }), 'Activity logs');

  await insertGenerated(50_000, id => ({
    id: BigInt(id), userId: uId(id), ticketId: tId(id),
    title: `Mock notification ${id}`, message: `Generated notification for load testing: ${id}`,
    type: pick(['TICKET_UPDATE', 'COMMENT', 'STATUS_CHANGE'], id),
    isRead: id % 2 === 0, createdAt: dateAt(id % 730),
  }), rows => prisma.notification.createMany({ data: rows }), 'Notifications');

  await insertGenerated(45_000, id => ({
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

  console.log('Mock dataset created successfully.');
  console.log('Expected rows: users=100000, tickets=250000, comments=300000, attachments=20000, notes=15000, history=200000, activity=120000, notifications=50000, audit=45000.');
}

main()
  .catch(error => {
    console.error('Load seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
