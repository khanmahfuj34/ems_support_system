import { SEARCH_MAX_TERM_LENGTH } from '../search.constants.js';

const MAX_UNSIGNED_BIGINT = 18446744073709551615n;

/** Trim, collapse whitespace, drop control characters, cap the length. */
export function normalizeSearchTerm(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex -- search input must strip control characters
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SEARCH_MAX_TERM_LENGTH);
}

/**
 * Escape LIKE wildcards. Every raw query below uses `ESCAPE '!'`,
 * so "!" is the escape character (a backslash is awkward inside JS + SQL).
 */
export function escapeLike(value: string): string {
  return value.replace(/[!%_]/g, (char) => `!${char}`);
}

export const containsPattern = (term: string) => `%${escapeLike(term)}%`;
export const prefixPattern = (term: string) => `${escapeLike(term)}%`;
export const wordPrefixPattern = (term: string) => `% ${escapeLike(term)}%`;

/** Returns a positive id that fits BIGINT UNSIGNED, or null. */
export function parsePositiveBigInt(term: string): bigint | null {
  if (!/^[1-9]\d{0,19}$/.test(term)) return null;
  const value = BigInt(term);
  return value <= MAX_UNSIGNED_BIGINT ? value : null;
}