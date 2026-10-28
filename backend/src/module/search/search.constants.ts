export const SEARCH_MAX_CONCURRENT = 500;
export const SEARCH_STATEMENT_TIMEOUT_MS = 5000;
export const SEARCH_TRANSACTION_TIMEOUT_MS = 8000;
export const SEARCH_TRANSACTION_MAX_WAIT_MS = 3000;

export const SEARCH_MIN_TEXT_LENGTH = 3;
export const SEARCH_MAX_TERM_LENGTH = 100;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/** Max rows one ticket-search request may scan (date-ordered). */
export const TICKET_SEARCH_SCAN_BUDGET = 5000;
/** Smaller budget for the global search box (fast, partial results are fine). */
export const GLOBAL_TICKET_SCAN_BUDGET = 2000;

export const REQUESTER_ID_LIMIT = 200;
export const LOOKUP_ID_LIMIT = 50;
export const GLOBAL_GROUP_LIMIT = 5;