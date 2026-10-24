import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { AddCommentResponse, CreateCommentInput } from "../types/comment.types";

export async function addTicketComment(
  ticketId: string,
  input: CreateCommentInput,
): Promise<AddCommentResponse> {
  const { data } = await apiClient.post<AddCommentResponse>(
    API_ENDPOINTS.tickets.comments(ticketId),
    input,
  );

  return data;
}
