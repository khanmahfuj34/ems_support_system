import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, Priority, Prisma } from '@prisma/client';
import { createMariaDbAdapter } from '../src/database/prisma/mariadb-adapter.js';
import { buildTicketDescriptionTextFields } from '../src/module/tickets/utils/ticket-description-text.js';

/**
 * Generates synthetic performance-test data for the EMS Support System.
 * Safety guard: requires explicit opt-in, a local DB host, and a DB name
 * containing "test" or "perf". It never deletes existing records.
 */

const TEST_PASSWORD = 'PerfTest-Only-2026!';
const PRIORITIES = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL];
const STATUS_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const BATCH_SIZE = readInt('PERF_BATCH_SIZE', 1000, 100, 5000);
const TICKET_COUNT = readInt('PERF_TICKET_COUNT', 1_000_000, 1, 1_000_000);
const USER_COUNT = readInt('PERF_USER_COUNT', 100_000, 2, 100_000);

function readInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}`);
  }
  return value;
}

function assertSafeTargetDatabase(): void {
  if (process.env.ALLOW_PERFORMANCE_SEED !== 'YES') {
    throw new Error('Safety stop: set ALLOW_PERFORMANCE_SEED=YES to explicitly enable performance seeding.');
  }

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL is not configured.');

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('DATABASE_URL is invalid.');
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  const looksLikeTestDatabase = /(test|perf)/i.test(databaseName);

  if (!isLocalHost || !looksLikeTestDatabase) {
    throw new Error(
      `Safety stop: refusing to seed host="${hostname}" database="${databaseName}". Use a LOCAL database whose name contains "test" or "perf" (for example ems_support_test).`,
    );
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function pickRequesterId(userIds: bigint[]): bigint {
  const regularUsers = userIds.length - 1;
  const bucketRoll = Math.random();
  let start: number;
  let end: number;

  if (bucketRoll < 0.2) {
    // 20% of tickets go to the heaviest 1% of regular requesters.
    start = Math.floor(regularUsers * 0.99);
    end = regularUsers;
  } else if (bucketRoll < 0.6) {
    // 40% go to the next 19% of requesters.
    start = Math.floor(regularUsers * 0.8);
    end = Math.max(start + 1, Math.floor(regularUsers * 0.99));
  } else {
    // 40% are spread across the remaining 80% of requesters.
    start = 0;
    end = Math.max(1, Math.floor(regularUsers * 0.8));
  }

  return userIds[1 + start + randomInt(0, Math.max(0, end - start - 1))];
}

function buildSyntheticTicketText(sequence: number) {
  const subject = `${pick(SUBJECTS)} | PERF case ${String(sequence).padStart(6, '0')}`;
  const parts = [
    `<p>${pick(DESCRIPTION_PARTS)}</p>`,
    ...(sequence % 5 === 0
      ? ['<p>The login workflow is affected in this synthetic sample.</p>']
      : []),
    ...(sequence % 10_000 === 0
      ? ['<p>RareSearchTermQzv731 appears in this rare-search sample.</p>']
      : []),
    `<p>Synthetic reference PERF-${String(sequence).padStart(10, '0')}; category, status, and requester relations are valid.</p>`,
  ];

  const description = parts.join('');
  const { preview } = buildTicketDescriptionTextFields(description);
  return { subject, description, descriptionPreview: preview };
}

async function refreshExistingPerformanceTickets(
  prisma: PrismaClient,
  userIds: bigint[],
  totalTickets: number,
  requesterCounts: Map<bigint, number>,
): Promise<void> {
  const allTickets = await prisma.ticket.count();
  if (allTickets !== totalTickets) {
    throw new Error(
      'PERF_REFRESH_EXISTING requires every ticket in the disposable database to be a contiguous PERF fixture.',
    );
  }

  console.log('Refreshing only the verified contiguous PERF fixture in batches.');
  let afterId = 0n;
  let refreshed = 0;

  while (true) {
    const rows = await prisma.ticket.findMany({
      where: {
        id: { gt: afterId },
        ticketNumber: { startsWith: 'PERF-' },
      },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      select: { id: true, ticketNumber: true },
    });
    if (rows.length === 0) break;

    const subjectCases: Prisma.Sql[] = [];
    const descriptionCases: Prisma.Sql[] = [];
    const previewCases: Prisma.Sql[] = [];
    const userCases: Prisma.Sql[] = [];

    for (const row of rows) {
      const sequenceMatch = row.ticketNumber.match(/^PERF-(\d{10})$/);
      if (!sequenceMatch) throw new Error('Invalid PERF ticket number found during refresh');
      const sequence = Number(sequenceMatch[1]);
      const content = buildSyntheticTicketText(sequence);
      const requesterId = pickRequesterId(userIds);
      requesterCounts.set(requesterId, (requesterCounts.get(requesterId) ?? 0) + 1);

      subjectCases.push(Prisma.sql`WHEN ${row.id} THEN ${content.subject}`);
      descriptionCases.push(Prisma.sql`WHEN ${row.id} THEN ${content.description}`);
      previewCases.push(Prisma.sql`WHEN ${row.id} THEN ${content.descriptionPreview}`);
      userCases.push(Prisma.sql`WHEN ${row.id} THEN ${requesterId}`);
    }

    const ids = Prisma.join(rows.map((row) => Prisma.sql`${row.id}`));
    await prisma.$executeRaw(Prisma.sql`
      UPDATE tickets
      SET subject = CASE id ${Prisma.join(subjectCases, ' ')} ELSE subject END,
          description = CASE id ${Prisma.join(descriptionCases, ' ')} ELSE description END,
          description_preview = CASE id ${Prisma.join(previewCases, ' ')} ELSE description_preview END,
          user_id = CASE id ${Prisma.join(userCases, ' ')} ELSE user_id END
      WHERE id IN (${ids})
    `);

    afterId = rows[rows.length - 1].id;
    refreshed += rows.length;
    if (refreshed % 10_000 === 0 || refreshed === totalTickets) {
      console.log(`Refreshed ${refreshed.toLocaleString()} / ${totalTickets.toLocaleString()} tickets`);
    }
  }
}

function randomDateBetween(start: Date, end: Date): Date {
  const startMs = start.getTime();
  const endMs = Math.max(startMs, end.getTime());
  return new Date(startMs + Math.floor(Math.random() * (endMs - startMs + 1)));
}

function laterDate(...dates: Date[]): Date {
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

const SUBJECTS = [
  'Login issue',
  'Password reset request',
  'Payment verification problem',
  'Email verification not arriving',
  'Dashboard page loads slowly',
  'Unable to upload attachment',
  'Ticket status not updating',
  'Account access issue',
  'API request timeout',
  'Notification delivery issue',
  'Profile update failing',
  'Report download failure',
  'Incorrect category assignment',
  'Session expires unexpectedly',
  'Search results are incomplete',
  'Two-factor verification issue',
  'File preview is not loading',
  'Support reply is missing',
  'Billing information needs correction',
  'Application displays an unexpected error',
] as const;

const DESCRIPTION_PARTS = [
  'The issue happens after signing in and reproduces in a fresh browser session.',
  'The page takes longer than expected to respond when the account has many records.',
  'The user tried again several times and captured the error details for investigation.',
  'The request succeeds intermittently, but the final result does not always appear.',
  'The problem started recently and affects the normal support workflow.',
  'The relevant screen should display the updated data without requiring a full refresh.',
  'This synthetic record is intended for search, sorting, filtering, and pagination tests.',
  'The expected behavior is a clear message and a response within a reasonable time.',
] as const;

const FIRST_NAMES = ['Alex', 'Sam', 'Taylor', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Jamie', 'Avery', 'Robin'];
const LAST_NAMES = ['Rahman', 'Khan', 'Ahmed', 'Das', 'Hossain', 'Chowdhury', 'Roy', 'Islam', 'Hasan', 'Karim'];
const CATEGORY_NAMES = [
  'PERF Account & Access',
  'PERF Billing & Payments',
  'PERF Technical Support',
  'PERF Email & Notifications',
  'PERF File & Attachment',
  'PERF Dashboard & Reports',
  'PERF API & Integrations',
  'PERF Profile & Settings',
  'PERF Security',
  'PERF General Inquiry',
] as const;
const SUBCATEGORY_NAMES = ['Login', 'Verification', 'Configuration'];

async function main(): Promise<void> {
  assertSafeTargetDatabase();

  const refreshFlag = process.env.PERF_REFRESH_EXISTING;
  if (refreshFlag && refreshFlag !== 'YES') {
    throw new Error('PERF_REFRESH_EXISTING must be set to YES when provided.');
  }
  const refreshExisting = refreshFlag === 'YES';

  const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

  try {
    await prisma.$connect();

    const existingPerformanceTickets = await prisma.ticket.count({
      where: { ticketNumber: { startsWith: 'PERF-' } },
    });

    if (refreshExisting && existingPerformanceTickets !== TICKET_COUNT) {
      throw new Error(
        'PERF_REFRESH_EXISTING requires the target total to equal the existing PERF ticket count.',
      );
    }

    // Permit safe continuation after a small dry run or an interrupted batch,
    // but only if the existing PERF ticket numbers form a complete sequence.
    let firstTicketToGenerate = 1;
    if (existingPerformanceTickets > 0) {
      const firstExisting = await prisma.ticket.findFirst({
        where: { ticketNumber: { startsWith: 'PERF-' } },
        orderBy: { ticketNumber: 'asc' },
        select: { ticketNumber: true },
      });
      const lastExisting = await prisma.ticket.findFirst({
        where: { ticketNumber: { startsWith: 'PERF-' } },
        orderBy: { ticketNumber: 'desc' },
        select: { ticketNumber: true },
      });
      const firstSequence = firstExisting?.ticketNumber.match(/^PERF-(\d{10})$/);
      const lastSequence = lastExisting?.ticketNumber.match(/^PERF-(\d{10})$/);
      const lastNumber = lastSequence ? Number(lastSequence[1]) : NaN;

      if (!firstSequence || !lastSequence || Number(firstSequence[1]) !== 1 || lastNumber !== existingPerformanceTickets) {
        throw new Error(
          'Existing PERF- tickets are not a contiguous sequence produced by this script. Use a fresh disposable test database instead of guessing which rows are safe to append.',
        );
      }
      if (existingPerformanceTickets > TICKET_COUNT) {
        throw new Error(
          `The database already contains ${existingPerformanceTickets.toLocaleString()} performance tickets, more than PERF_TICKET_COUNT=${TICKET_COUNT}. Set the requested total to at least the existing count or use a fresh test database.`,
        );
      }
      if (existingPerformanceTickets === TICKET_COUNT) {
        console.log(
          `Already seeded ${TICKET_COUNT.toLocaleString()} performance tickets; skipping ticket creation.`,
        );

      }
      firstTicketToGenerate = existingPerformanceTickets + 1;
    }

    console.log(
      `Target DB validated. Preparing ${USER_COUNT} synthetic users and a total of ${TICKET_COUNT.toLocaleString()} tickets (starting at #${firstTicketToGenerate.toLocaleString()}).`,
    );

    // Seed fixed lookup records required by schema relations.
    for (const role of [
      { id: 1, name: 'USER' },
      { id: 2, name: 'ADMIN' },
    ]) {
      await prisma.userRole.upsert({
        where: { id: role.id },
        update: { name: role.name },
        create: role,
      });
    }

    const statuses = [
      { id: 1, name: 'OPEN' },
      { id: 2, name: 'PENDING_REVIEW' },
      { id: 3, name: 'ACCEPTED' },
      { id: 4, name: 'IN_PROGRESS' },
      { id: 5, name: 'WAITING_FOR_USER' },
      { id: 6, name: 'RESOLVED' },
      { id: 7, name: 'CLOSED' },
      { id: 8, name: 'REJECTED' },
      { id: 9, name: 'REOPENED' },
    ];
    for (const status of statuses) {
      await prisma.ticketStatus.upsert({
        where: { id: status.id },
        update: { name: status.name },
        create: status,
      });
    }

    const policies = [
      { priority: Priority.CRITICAL, firstResponseMinutes: 15, resolutionMinutes: 120 },
      { priority: Priority.HIGH, firstResponseMinutes: 30, resolutionMinutes: 240 },
      { priority: Priority.MEDIUM, firstResponseMinutes: 120, resolutionMinutes: 720 },
      { priority: Priority.LOW, firstResponseMinutes: 480, resolutionMinutes: 2880 },
    ];
    const slaPolicyIdByPriority = new Map<Priority, bigint>();
    for (const policy of policies) {
      const saved = await prisma.slaPolicy.upsert({
        where: { priority: policy.priority },
        update: {
          firstResponseMinutes: policy.firstResponseMinutes,
          resolutionMinutes: policy.resolutionMinutes,
          isActive: true,
        },
        create: { ...policy, isActive: true },
      });
      slaPolicyIdByPriority.set(saved.priority, saved.id);
    }

    const now = new Date();
    const userIds: bigint[] = [];
    const requesterCounts = new Map<bigint, number>();
    const adminEmail = 'perf.admin@example.test';

    if (refreshExisting) {
      const totalUsers = await prisma.user.count();
      const syntheticUsers = await prisma.user.count({
        where: {
          OR: [
            { email: 'perf.admin@example.test' },
            { email: { startsWith: 'perf.user.' } },
          ],
        },
      });
      if (totalUsers !== USER_COUNT || syntheticUsers !== USER_COUNT) {
        throw new Error(
          'PERF_REFRESH_EXISTING requires every user in the disposable database to be a generated PERF user.',
        );
      }
      const generatedUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: adminEmail },
            { email: { startsWith: 'perf.user.' } },
          ],
        },
        orderBy: { email: 'asc' },
        select: { id: true, email: true },
      });
      if (
        generatedUsers.length !== USER_COUNT ||
        generatedUsers[0]?.email !== adminEmail
      ) {
        throw new Error('PERF_REFRESH_EXISTING could not verify the expected generated user fixture.');
      }
      userIds.push(...generatedUsers.map((user) => user.id));
      await refreshExistingPerformanceTickets(
        prisma,
        userIds,
        TICKET_COUNT,
        requesterCounts,
      );
    } else {
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
      for (let i = 0; i < USER_COUNT; i += 1) {
        const isAdmin = i === 0;
        const email = isAdmin
          ? adminEmail
          : `perf.user.${String(i + 1).padStart(4, '0')}@example.test`;
        const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${String(i + 1).padStart(3, '0')}`;
        const user = await prisma.user.upsert({
          where: { email },
          update: {
            name,
            password: passwordHash,
            roleId: isAdmin ? 2 : 1,
            isActive: true,
            emailVerifiedAt: now,
          },
          create: {
            name,
            email,
            password: passwordHash,
            roleId: isAdmin ? 2 : 1,
            isActive: true,
            emailVerifiedAt: now,
          },
          select: { id: true },
        });
        userIds.push(user.id);
      }
    }

    const categoryIds: bigint[] = [];
    const subCategoryIdsByCategory = new Map<string, bigint[]>();
    for (const categoryName of CATEGORY_NAMES) {
      const category = await prisma.ticketCategory.upsert({
        where: { name: categoryName },
        update: { isActive: true },
        create: {
          name: categoryName,
          description: 'Synthetic category reserved for local performance testing.',
          isActive: true,
        },
        select: { id: true },
      });
      categoryIds.push(category.id);
      const subCategoryIds: bigint[] = [];
      for (const subCategoryName of SUBCATEGORY_NAMES) {
        const subCategory = await prisma.ticketSubCategory.upsert({
          where: { categoryId_name: { categoryId: category.id, name: subCategoryName } },
          update: { isActive: true },
          create: {
            categoryId: category.id,
            name: subCategoryName,
            description: 'Synthetic subcategory for performance tests.',
            isActive: true,
          },
          select: { id: true },
        });
        subCategoryIds.push(subCategory.id);
      }
      subCategoryIdsByCategory.set(category.id.toString(), subCategoryIds);
    }

    const ticketsToInsert: Prisma.TicketCreateManyInput[] = [];
    let inserted = existingPerformanceTickets;
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (let i = firstTicketToGenerate; i <= TICKET_COUNT; i += 1) {
      const categoryId = pick(categoryIds);
      const subCategoryIds = subCategoryIdsByCategory.get(categoryId.toString())!;
      const userPriority = pick(PRIORITIES);
      const adminPriority = Math.random() < 0.35 ? pick(PRIORITIES) : null;
      const statusId = pick(STATUS_IDS);
      const createdAt = new Date(now.getTime() - randomInt(0, 365) * oneDayMs - randomInt(0, oneDayMs - 1));
      const naturalUpdateDate = randomDateBetween(createdAt, now);
      const resolvedAt = [6, 7].includes(statusId) ? randomDateBetween(createdAt, now) : null;
      const closedAt = statusId === 7 && resolvedAt
        ? randomDateBetween(resolvedAt, now)
        : null;
      const updatedAt = laterDate(
        createdAt,
        naturalUpdateDate,
        ...(resolvedAt ? [resolvedAt] : []),
        ...(closedAt ? [closedAt] : []),
      );
      const firstResponseAt = Math.random() < 0.72
        ? randomDateBetween(createdAt, updatedAt)
        : null;
      const firstResponseMinutes = policies.find((p) => p.priority === userPriority)!.firstResponseMinutes;
      const resolutionMinutes = policies.find((p) => p.priority === userPriority)!.resolutionMinutes;
      const { subject, description, descriptionPreview } =
        buildSyntheticTicketText(i);
      const requesterId = pickRequesterId(userIds);
      requesterCounts.set(requesterId, (requesterCounts.get(requesterId) ?? 0) + 1);

      ticketsToInsert.push({
        ticketNumber: `PERF-${String(i).padStart(10, '0')}`,
        userId: requesterId,
        categoryId,
        subCategoryId: pick(subCategoryIds),
        slaPolicyId: slaPolicyIdByPriority.get(userPriority)!,
        subject,
        description,
        descriptionPreview,
        userPriority,
        adminPriority,
        statusId,
        slaStatus: [6, 7, 8].includes(statusId) ? 4 : pick([1, 1, 1, 2, 2, 3]),
        firstResponseAt,
        firstResponseDueAt: new Date(createdAt.getTime() + firstResponseMinutes * 60_000),
        resolutionDueAt: new Date(createdAt.getTime() + resolutionMinutes * 60_000),
        resolvedAt,
        closedAt,
        rejectionReason: statusId === 8 ? 'Synthetic rejection reason for testing.' : null,
        resolutionSummary: resolvedAt ? 'Synthetic resolution summary for performance testing.' : null,
        createdAt,
        updatedAt,
      });

      if (ticketsToInsert.length >= BATCH_SIZE || i === TICKET_COUNT) {
        await prisma.ticket.createMany({ data: ticketsToInsert });
        inserted += ticketsToInsert.length;
        ticketsToInsert.length = 0;
        if (inserted % 10_000 === 0 || inserted === TICKET_COUNT) {
          console.log(`Inserted ${inserted.toLocaleString()} / ${TICKET_COUNT.toLocaleString()} tickets`);
        }
      }
    }

    console.log('\nPerformance seed completed.');
    console.log(`Database: ${new URL(process.env.DATABASE_URL!).pathname.replace(/^\//, '')}`);
    console.log(`Synthetic users: ${USER_COUNT} (1 admin, ${USER_COUNT - 1} regular users)`);
    console.log(`Synthetic tickets: ${inserted.toLocaleString()}`);
    const ownerCounts = [...requesterCounts.values()].sort((left, right) => left - right);
    const ownerPercentile = (fraction: number): number => {
      return ownerCounts[Math.max(0, Math.ceil(ownerCounts.length * fraction) - 1)] ?? 0;
    };
    console.log(
      `Tickets per requester assigned this run (${ownerCounts.length} active): p50=${ownerPercentile(0.5)}, p95=${ownerPercentile(0.95)}, p99=${ownerPercentile(0.99)}, max=${ownerCounts.at(-1) ?? 0}`,
    );
    console.log('Common term login appears in about 20% of descriptions; rare marker appears once per 10,000 tickets.');
    console.log(`Synthetic admin email: ${adminEmail}`);
    console.log(`Synthetic test password (shared by generated users): ${TEST_PASSWORD}`);
    console.log('Use this password only in this disposable local test database.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Performance seed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
