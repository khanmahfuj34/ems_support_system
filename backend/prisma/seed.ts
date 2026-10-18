
import 'dotenv/config';
import { PrismaClient, Priority } from '@prisma/client';
import { createMariaDbAdapter } from '../src/database/prisma/mariadb-adapter.js';

const prisma = new PrismaClient({
  adapter: createMariaDbAdapter(),
});

async function main() {
  // Fixed application roles
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

  // Fixed ticket statuses
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

  // Initial SLA policies from the project PRD
  const policies = [
    {
      priority: Priority.CRITICAL,
      firstResponseMinutes: 15,
      resolutionMinutes: 120,
    },
    {
      priority: Priority.HIGH,
      firstResponseMinutes: 30,
      resolutionMinutes: 240,
    },
    {
      priority: Priority.MEDIUM,
      firstResponseMinutes: 120,
      resolutionMinutes: 720,
    },
    {
      priority: Priority.LOW,
      firstResponseMinutes: 480,
      resolutionMinutes: 2880,
    },
  ];

  for (const policy of policies) {
    await prisma.slaPolicy.upsert({
      where: { priority: policy.priority },
      update: {
        firstResponseMinutes: policy.firstResponseMinutes,
        resolutionMinutes: policy.resolutionMinutes,
      },
      create: policy,
    });
  }

  console.log('Seed completed: roles, statuses and SLA policies.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
