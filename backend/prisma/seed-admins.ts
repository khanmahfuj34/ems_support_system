import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const ADMIN_ROLE_ID = 2;
const BCRYPT_ROUNDS = 12;

type AdminAccount = {
  name: string;
  email: string;
  password: string;
};

function parseAdminAccounts(): AdminAccount[] {
  const rawAccounts = process.env.ADMIN_ACCOUNTS?.trim();

  if (!rawAccounts) {
    throw new Error('ADMIN_ACCOUNTS is required.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawAccounts);
  } catch {
    throw new Error('ADMIN_ACCOUNTS must contain a JSON array.');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('ADMIN_ACCOUNTS must contain at least one account.');
  }

  const seenEmails = new Set<string>();

  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`ADMIN_ACCOUNTS entry ${index + 1} is invalid.`);
    }

    const record = entry as Record<string, unknown>;
    const email =
      typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
    const password = typeof record.password === 'string' ? record.password : '';
    const emailName = email.split('@')[0] ?? '';
    const name =
      typeof record.name === 'string' && record.name.trim()
        ? record.name.trim()
        : emailName;

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 255 ||
      !name ||
      name.length > 150 ||
      password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      throw new Error(`ADMIN_ACCOUNTS entry ${index + 1} is invalid.`);
    }

    if (seenEmails.has(email)) {
      throw new Error('ADMIN_ACCOUNTS contains duplicate email addresses.');
    }
    seenEmails.add(email);

    return { name, email, password };
  });
}

function createAdapter() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is missing.');
  }

  const url = new URL(connectionString);

  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 5,
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

async function ensureAdminRole(prisma: PrismaClient) {
  const role = await prisma.userRole.findUnique({
    where: { id: ADMIN_ROLE_ID },
  });

  if (role) {
    if (role.name !== 'ADMIN') {
      throw new Error('Role ID 2 is not configured as ADMIN.');
    }
    return;
  }

  const existingAdminRole = await prisma.userRole.findUnique({
    where: { name: 'ADMIN' },
  });

  if (existingAdminRole) {
    throw new Error('ADMIN role is configured with an unexpected ID.');
  }

  try {
    await prisma.userRole.create({
      data: { id: ADMIN_ROLE_ID, name: 'ADMIN' },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const createdRole = await prisma.userRole.findUnique({
      where: { id: ADMIN_ROLE_ID },
    });
    if (!createdRole || createdRole.name !== 'ADMIN') throw error;
  }
}

async function syncAdminAccount(prisma: PrismaClient, account: AdminAccount) {
  let existing = await prisma.user.findUnique({
    where: { email: account.email },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      roleId: true,
    },
  });

  if (!existing) {
    const password = await bcrypt.hash(account.password, BCRYPT_ROUNDS);

    try {
      await prisma.user.create({
        data: {
          name: account.name,
          email: account.email,
          password,
          roleId: ADMIN_ROLE_ID,
        },
        select: { id: true },
      });
      return;
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      existing = await prisma.user.findUnique({
        where: { email: account.email },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          roleId: true,
        },
      });
      if (!existing) throw error;
    }
  }

  const passwordMatches = await bcrypt.compare(
    account.password,
    existing.password,
  );

  if (
    existing.name === account.name &&
    existing.email === account.email &&
    existing.roleId === ADMIN_ROLE_ID &&
    passwordMatches
  ) {
    return;
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: account.name,
      email: account.email,
      roleId: ADMIN_ROLE_ID,
      ...(passwordMatches
        ? {}
        : { password: await bcrypt.hash(account.password, BCRYPT_ROUNDS) }),
    },
    select: { id: true },
  });
}

async function main() {
  const accounts = parseAdminAccounts();
  const prisma = new PrismaClient({ adapter: createAdapter() });

  try {
    await prisma.$connect();
    await ensureAdminRole(prisma);

    for (const account of accounts) {
      await syncAdminAccount(prisma, account);
    }

    console.log('Admin account provisioning completed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error(
    'Admin account provisioning failed. Check ADMIN_ACCOUNTS and database configuration.',
  );
  process.exitCode = 1;
});
