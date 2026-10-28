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
  descriptionPreview?: string;
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

export interface SearchUserItem {
  id: string;
  name: string;
  email: string;
  roleId: number;
  isActive: boolean;
  createdAt: string;
}

export interface SearchTicketsParams {
  search: string;
  limit?: number;
  cursor?: string | null;
  statusId?: number;
  priority?: TicketPriority;
  categoryId?: string;
}

export interface SearchTicketsPagination {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
  total?: number;
}

export interface SearchTicketsResponse {
  message: string;
  data: SearchTicketItem[];
  pagination: SearchTicketsPagination;
}

export interface SearchUsersParams {
  search: string;
  limit?: number;
  cursor?: string | null;
}

export interface SearchUsersResponse {
  message: string;
  data: SearchUserItem[];
  pagination: SearchTicketsPagination;
}
