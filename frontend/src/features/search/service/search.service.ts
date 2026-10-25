import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type {
  SearchTicketsParams,
  SearchTicketsResponse,
} from "../types/search.types";

/**
 * Searches tickets using the authenticated tickets list endpoint.
 *
 * Scoped automatically by the backend to the current user's tickets
 * (or all tickets if the caller is an administrator).
 */
export async function searchTickets(
  params: SearchTicketsParams,
  signal?: AbortSignal,
): Promise<SearchTicketsResponse> {
  const trimmed = params.search.trim();

  if (trimmed.length < 3) {
    return {
      message: "Search query requires at least 3 characters",
      data: [],
      pagination: {
        page: 1,
        limit: params.limit ?? 8,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const { data } = await apiClient.get<SearchTicketsResponse>(
    API_ENDPOINTS.tickets.list,
    {
      params: {
        search: trimmed,
        limit: params.limit ?? 8,
        page: params.page ?? 1,
        ...(params.statusId !== undefined ? { statusId: params.statusId } : {}),
        ...(params.priority ? { priority: params.priority } : {}),
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      },
      signal,
    },
  );

  return data;
}
