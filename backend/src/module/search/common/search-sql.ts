import { Prisma } from '@prisma/client';

/** Only fixed integer values may be inserted as raw SQL. */
export const intSql = (value: number) =>
  Prisma.raw(String(Math.trunc(value)));
