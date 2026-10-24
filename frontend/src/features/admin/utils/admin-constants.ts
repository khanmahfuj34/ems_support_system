/** Status row ids of the seeded ticket_statuses table used by admin views. */
export const PENDING_REVIEW_STATUS_ID = 2;
export const IN_PROGRESS_STATUS_ID = 4;
export const RESOLVED_STATUS_ID = 6;

/** Full seeded ticket_statuses table ids (unchanged seeds). */
export const TICKET_STATUS_ID = {
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

/** Seeded sla_statuses id meaning "on track". */
export const SLA_STATUS_ON_TRACK = 1;

export const PRIORITY_FILTERS = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const ADMIN_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export type DateRangeValue = "ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS";

export const DATE_RANGES: {
  value: DateRangeValue;
  label: string;
  days: number | null;
}[] = [
  { value: "ALL", label: "All Time", days: null },
  { value: "TODAY", label: "Today", days: 1 },
  { value: "LAST_7_DAYS", label: "Last 7 days", days: 7 },
  { value: "LAST_30_DAYS", label: "Last 30 days", days: 30 },
];

export const ADMIN_PAGE_SIZE = 10;

export const PRIORITY_DOT_CLASSES: Record<string, string> = {
  LOW: "bg-emerald-500",
  MEDIUM: "bg-sky-500",
  HIGH: "bg-red-500",
  CRITICAL: "bg-red-600",
};

const STATUS_CHIP_CLASSES: Record<number, string> = {
  [TICKET_STATUS_ID.OPEN]: "border-gray-200 bg-gray-50 text-gray-600",
  [TICKET_STATUS_ID.PENDING_REVIEW]: "border-blue-200 bg-blue-50 text-blue-700",
  [TICKET_STATUS_ID.ACCEPTED]: "border-sky-200 bg-sky-50 text-sky-700",
  [TICKET_STATUS_ID.IN_PROGRESS]: "border-gray-200 bg-gray-100 text-gray-700",
  [TICKET_STATUS_ID.WAITING_FOR_USER]: "border-amber-200 bg-amber-50 text-amber-700",
  [TICKET_STATUS_ID.RESOLVED]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [TICKET_STATUS_ID.CLOSED]: "border-gray-200 bg-gray-100 text-gray-500",
  [TICKET_STATUS_ID.REJECTED]: "border-red-200 bg-red-50 text-red-700",
  [TICKET_STATUS_ID.REOPENED]: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

export const STATUS_CHIP_FALLBACK_CLASSES = "border-gray-200 bg-gray-100 text-gray-600";

export function getStatusChipClasses(statusId: number) {
  return STATUS_CHIP_CLASSES[statusId] ?? STATUS_CHIP_FALLBACK_CLASSES;
}

export const QUEUE_TABS: {
  key: string;
  label: string;
  statusId: number | undefined;
  countKey: "total" | "pending" | "inProgress" | "resolved" | "rejected" | "closed";
}[] = [
  { key: "ALL", label: "All Tickets", statusId: undefined, countKey: "total" },
  {
    key: "PENDING_REVIEW",
    label: "Pending Review",
    statusId: TICKET_STATUS_ID.PENDING_REVIEW,
    countKey: "pending",
  },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    statusId: TICKET_STATUS_ID.IN_PROGRESS,
    countKey: "inProgress",
  },
  {
    key: "RESOLVED",
    label: "Resolved",
    statusId: TICKET_STATUS_ID.RESOLVED,
    countKey: "resolved",
  },
  {
    key: "REJECTED",
    label: "Rejected",
    statusId: TICKET_STATUS_ID.REJECTED,
    countKey: "rejected",
  },
  { key: "CLOSED", label: "Closed", statusId: TICKET_STATUS_ID.CLOSED, countKey: "closed" },
];

export const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-pink-100 text-pink-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
];
