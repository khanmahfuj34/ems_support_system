import { BadRequestException } from '@nestjs/common';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../search.constants.js';

export function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE_SIZE);
}

/** Small cursor for lists ordered by a single unique id (user search). */
export function encodeIdCursor(term: string, id: bigint): string {
  return Buffer.from(
    JSON.stringify({ v: 1, term, id: id.toString() }),
  ).toString('base64url');
}

export function decodeIdCursor(cursor: string, term: string): bigint {
  let parsed: { v?: number; term?: string; id?: string };
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new BadRequestException('Invalid pagination cursor');
  }
  if (
    parsed.v !== 1 ||
    typeof parsed.id !== 'string' ||
    !/^[1-9]\d*$/.test(parsed.id)
  ) {
    throw new BadRequestException('Invalid pagination cursor');
  }
  if (parsed.term !== term) {
    throw new BadRequestException('Cursor does not match the current search');
  }
  return BigInt(parsed.id);
}