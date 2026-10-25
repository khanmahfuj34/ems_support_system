import type { TicketPriority } from "@/features/tickets/types/ticket.types";

export interface SearchTicketCategory {
  id: string;
  name: string;
}

export interface SearchTicketStatus {
  id: number;
  name: string;
}

export interface SearchTicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  description?: string;
  userId?: string;
  statusId: number;
  slaStatus?: number;
  userPriority: TicketPriority;
  adminPriority?: TicketPriority | null;
  createdAt: string;
  category: SearchTicketCategory | null;
  subCategory?: SearchTicketCategory | null;
  status?: SearchTicketStatus | null;
}

export interface SearchTicketsParams {
  search: string;
  limit?: number;
  page?: number;
  statusId?: number;
  priority?: TicketPriority;
  categoryId?: string;
}

export interface SearchTicketsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SearchTicketsResponse {
  message: string;
  data: SearchTicketItem[];
  pagination: SearchTicketsPagination;
}
