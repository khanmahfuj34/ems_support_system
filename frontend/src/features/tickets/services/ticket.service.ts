import type { AxiosError } from "axios";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type {
  AddCommentResponse,
  CreateCommentInput,
  CreateTicketInput,
  CreateTicketResponse,
  ListCommentsResponse,
  TicketDetailResponse,
} from "../types/ticket.types";

type ApiErrorBody = {
  message?: string | string[];
};

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

export function getTicketApiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<ApiErrorBody>;
  const message = axiosError.response?.data?.message;

  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string" && message.trim()) return message;
  if (axiosError.code === "ERR_NETWORK") {
    return "The SupportDesk API could not be reached. Check that the backend is running.";
  }

  return fallback;
}

export async function getTicket(ticketId: string): Promise<TicketDetailResponse> {
  const { data } = await apiClient.get<TicketDetailResponse>(
    API_ENDPOINTS.tickets.byId(ticketId),
  );

  return data;
}

export async function getTicketComments(
  ticketId: string,
): Promise<ListCommentsResponse> {
  const { data } = await apiClient.get<ListCommentsResponse>(
    API_ENDPOINTS.tickets.comments(ticketId),
  );

  return data;
}

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
