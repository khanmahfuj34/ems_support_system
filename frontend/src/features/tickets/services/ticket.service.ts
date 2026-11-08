import type { AxiosRequestConfig } from "axios";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type {
  CreateTicketInput,
  CreateTicketResponse,
  TicketDetailResponse,
  TicketListParams,
  TicketListResponse,
} from "../types/ticket.types";

export async function createTicket(values: CreateTicketInput): Promise<CreateTicketResponse> {
  const payload: CreateTicketInput = {
    subject: values.subject.trim(),
    description: values.description.trim(),
    categoryId: values.categoryId,
    priority: values.priority,
  };

  if (values.subCategoryId && values.subCategoryId.trim() !== "") {
    payload.subCategoryId = values.subCategoryId;
  }

  const { data } = await apiClient.post<CreateTicketResponse>(
    API_ENDPOINTS.tickets.create,
    payload,
  );

  return data;
}

export async function getTicket(ticketId: string): Promise<TicketDetailResponse> {
  const { data } = await apiClient.get<TicketDetailResponse>(
    API_ENDPOINTS.tickets.byId(ticketId),
  );

  return data;
}

/**
 * Cursor-paginated ticket list. The backend scopes rows to the authenticated
 * account (regular users only ever receive their own tickets) and applies
 * status/priority/category/search/sorting server-side.
 */
export async function listMyTickets(
  params: TicketListParams = {},
  config?: AxiosRequestConfig,
): Promise<TicketListResponse> {
  const search = params.search?.trim();

  const { data } = await apiClient.get<TicketListResponse>(
    API_ENDPOINTS.tickets.list,
    {
      params: {
        limit: params.limit ?? 10,
        sortBy: params.sortBy ?? "createdAt",
        sortOrder: params.sortOrder ?? "desc",
        ...(params.cursor ? { cursor: params.cursor } : {}),
        ...(params.statusId !== undefined ? { statusId: params.statusId } : {}),
        ...(params.priority ? { priority: params.priority } : {}),
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        ...(search ? { search } : {}),
      },
      signal: config?.signal,
      ...(config?.headers ? { headers: config.headers } : {}),
    },
  );

  return data;
}

/**
 * Fetches only the pagination metadata of the ticket list to read the total
 * number of the caller's tickets (optionally scoped to one status) without
 * loading rows. Powers the summary cards; never part of page navigation.
 */
export async function countMyTickets(options?: {
  statusId?: number;
  signal?: AbortSignal;
}): Promise<number> {
  const { data } = await apiClient.get<TicketListResponse>(
    API_ENDPOINTS.tickets.list,
    {
      params: {
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 1,
        includeTotal: true,
        ...(options?.statusId !== undefined
          ? { statusId: options.statusId }
          : {}),
      },
      signal: options?.signal,
    },
  );

  return data.pagination.total ?? 0;
}
