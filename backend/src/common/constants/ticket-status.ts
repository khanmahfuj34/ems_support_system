/**
 * Status lookup IDs. These must match the TicketStatus records
 * created by prisma/seed.ts. Keep them in sync with the database.
 */
export const TICKET_STATUS = {
  OPEN: 1,
  PENDING_REVIEW: 2,
  ACCEPTED: 3,
  IN_PROGRESS: 4,
  WAITING_FOR_USER: 5,
  RESOLVED: 6,
  CLOSED: 7,
  REJECTED: 8,
  REOPENED: 9,
} as const;

/**
 * Status ID to name mapping, derived from TICKET_STATUS so the two
 * can never drift apart.
 */
export const TICKET_STATUS_NAME: Record<number, string> = Object.fromEntries(
  (Object.entries(TICKET_STATUS) as [string, number][]).map(([name, id]) => [
    id,
    name,
  ]),
);
