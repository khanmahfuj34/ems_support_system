import { ServiceUnavailableException } from '@nestjs/common';

const DB_UNAVAILABLE_CODES = new Set([
  '3024',
  'ER_QUERY_TIMEOUT',
  'ER_QUERY_INTERRUPTED',
  'ER_GET_CONNECTION_TIMEOUT',
  'P2024',
  'P2028',
  'ETIMEDOUT',
]);

export function isDatabaseUnavailableError(error: unknown): boolean {
  const pending: unknown[] = [error];
  const seen = new Set<object>();

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);

    const record = current as {
      code?: unknown;
      cause?: unknown;
      meta?: { code?: unknown; driverAdapterError?: unknown };
    };
    const codes = [record.code, record.meta?.code]
      .filter(
        (c): c is string | number =>
          typeof c === 'string' || typeof c === 'number',
      )
      .map(String);

    if (codes.some((code) => DB_UNAVAILABLE_CODES.has(code))) return true;
    pending.push(record.cause, record.meta?.driverAdapterError);
  }
  return false;
}

/** Timeout / pool errors become a controlled 503; everything else is rethrown. */
export function mapSearchError(error: unknown): unknown {
  if (isDatabaseUnavailableError(error)) {
    return new ServiceUnavailableException('Search is temporarily unavailable');
  }
  return error;
}