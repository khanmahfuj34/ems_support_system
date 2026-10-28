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
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
    /** Present only when the request explicitly asks for `includeTotal`. */
    total?: number;
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

export interface AdminQueueRow extends AdminTicketRow {
  timeAgo: string;
}

export type AdminDetailTab = "details" | "conversation" | "attachments" | "activity";

export interface AcceptTicketResponse {
  message: string;
  data: AdminTicketReviewResponse["data"];
}

export interface AdminUserProfile {
  id: string;
  name: string;
  email: string;
  roleId: number;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  role: { id: number; name: string };
}

export interface AdminUserProfileResponse {
  message: string;
  data: AdminUserProfile;
}

export interface AdminUserTicketHistoryItem {
  id: string;
  ticketNumber: string;
  subject: string;
  userPriority: TicketPriority;
  adminPriority: TicketPriority | null;
  statusId: number;
  status: { id: number; name: string } | null;
  createdAt: string;
}

export interface AdminUserTicketHistoryResponse {
  message: string;
  data: AdminUserTicketHistoryItem[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
    total?: number;
  };
}
