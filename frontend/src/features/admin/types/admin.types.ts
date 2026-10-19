import type { TicketPriority } from "@/features/tickets/types/ticket.types";

export interface AdminTicketRow {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  userId: string;
  userPriority: TicketPriority;
  adminPriority: TicketPriority | null;
  statusId: number;
  slaStatus: number;
  createdAt: string;
  category: { id: string; name: string } | null;
  subCategory: { id: string; name: string } | null;
  status: { id: number; name: string } | null;
}

export interface AdminTicketListResponse {
  message: string;
  data: AdminTicketRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminTicketReviewResponse {
  message: string;
  data: {
    id: string;
    ticketNumber: string;
    statusId: number;
    status: string;
    rejectionReason: string | null;
  };
}

export interface AcceptTicketResponse {
  message: string;
  data: AdminTicketReviewResponse["data"];
}
