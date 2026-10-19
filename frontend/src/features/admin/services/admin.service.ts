import type { AxiosError } from "axios";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { TicketPriority } from "@/features/tickets/types/ticket.types";
import type {
  AdminTicketListResponse,
  AdminTicketReviewResponse,
} from "../types/admin.types";

type ApiErrorBody = {
  message?: string | string[];
};

/** Status row id of the review queue in the seeded ticket_statuses table. */
export const PENDING_REVIEW_STATUS_ID = 2;

/** Seeded status ids used by the dashboard summary cards. */
export const IN_PROGRESS_STATUS_ID = 4;
export const RESOLVED_STATUS_ID = 6;

/**
 * Fetch only the pagination metadata of the ticket list to read the total
 * number of tickets (optionally scoped to one status) without loading rows.
 */
export async function countTickets(options?: {
  statusId?: number;
}): Promise<number> {
  const { data } = await apiClient.get<AdminTicketListResponse>(
    API_ENDPOINTS.tickets.list,
    {
      params: {
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 1,
        ...(options?.statusId !== undefined
          ? { statusId: options.statusId }
          : {}),
      },
    },
  );

  return data.pagination.total;
}

export async function listPendingReviewTickets(): Promise<AdminTicketListResponse> {
  const { data } = await apiClient.get<AdminTicketListResponse>(
    API_ENDPOINTS.tickets.list,
    {
      params: {
        statusId: PENDING_REVIEW_STATUS_ID,
        sortBy: "createdAt",
        sortOrder: "asc",
        limit: 50,
      },
    },
  );

  return data;
}

/**
 * Paginated ticket list for the admin support desk.
 * All filters are applied server-side; the API scopes rows to the caller
 * (admins see every ticket, users only their own).
 */
export async function listTickets(options?: {
  page?: number;
  statusId?: number;
  categoryId?: string;
  priority?: TicketPriority;
}): Promise<AdminTicketListResponse> {
  const { data } = await apiClient.get<AdminTicketListResponse>(
    API_ENDPOINTS.tickets.list,
    {
      params: {
        page: options?.page ?? 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
        ...(options?.statusId !== undefined
          ? { statusId: options.statusId }
          : {}),
        ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
        ...(options?.priority ? { priority: options.priority } : {}),
      },
    },
  );

  return data;
}

export async function acceptTicket(
  ticketId: string,
): Promise<AdminTicketReviewResponse> {
  const { data } = await apiClient.patch<AdminTicketReviewResponse>(
    API_ENDPOINTS.admin.acceptTicket(ticketId),
  );

  return data;
}

export async function rejectTicket(
  ticketId: string,
  reason: string,
): Promise<AdminTicketReviewResponse> {
  const { data } = await apiClient.patch<AdminTicketReviewResponse>(
    API_ENDPOINTS.admin.rejectTicket(ticketId),
    { reason },
  );

  return data;
}

export function getAdminApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const axiosError = error as AxiosError<ApiErrorBody>;
  const message = axiosError.response?.data?.message;

  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string" && message.trim()) return message;
  if (axiosError.code === "ERR_NETWORK") {
    return "The SupportDesk API could not be reached. Check that the backend is running.";
  }

  return fallback;
}
