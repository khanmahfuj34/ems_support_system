import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type {
  CreateTicketInput,
  CreateTicketResponse,
  TicketDetailResponse,
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
