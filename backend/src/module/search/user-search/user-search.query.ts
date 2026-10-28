import { Prisma } from '@prisma/client';

import {
  containsPattern,
  prefixPattern,
  wordPrefixPattern,
} from '../common/search-normalization.js';

/** Light user columns: no passwords, no relations. */
export const USER_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  roleId: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const USER_PROFILE_SELECT = {
  ...USER_LIST_SELECT,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

/**
 * Search exact user ID, name prefixes/word prefixes, and email substrings.
 * Email substring matching supports queries such as "@gmail.com".
 */
export async function findUserIds(
  db: Prisma.TransactionClient,
  term: string,
  numericId: bigint | null,
  afterId: bigint | undefined,
  take: number,
): Promise<bigint[]> {
  const parts: Prisma.Sql[] = [
    Prisma.sql`u.name LIKE ${prefixPattern(term)} ESCAPE '!'`,
    Prisma.sql`u.name LIKE ${wordPrefixPattern(term)} ESCAPE '!'`,
    Prisma.sql`u.email LIKE ${prefixPattern(term)} ESCAPE '!'`,
    Prisma.sql`u.email LIKE ${containsPattern(term)} ESCAPE '!'`,
  ];
  if (numericId !== null) parts.push(Prisma.sql`u.id = ${numericId}`);

  const after =
    afterId !== undefined ? Prisma.sql`AND u.id < ${afterId}` : Prisma.empty;

  const rows = await db.$queryRaw<{ id: bigint | number }[]>`
    SELECT u.id AS id
    FROM users u
    WHERE (${Prisma.join(parts, ' OR ')}) ${after}
    ORDER BY u.id DESC
    LIMIT ${Prisma.raw(String(Math.trunc(take)))}
  `;

  return rows.map((row) => BigInt(row.id));
}
