export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface PriorityOption {
  value: TicketPriority;
  label: string;
  description: string;
  dotColor: string;
  badgeBg: string;
  borderColor: string;
  selectedBg: string;
  selectedBorder: string;
}

export interface TicketAttachmentItem {
  id: string;
  file: File;
  name: string;
  size: number;
  formattedSize: string;
  type: string;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  categoryId: string;
  subCategoryId?: string;
  priority: TicketPriority;
}

export interface TicketResponseData {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  userPriority: TicketPriority;
  statusId: number;
  slaStatus: number;
  firstResponseDueAt?: string;
  resolutionDueAt?: string;
  createdAt: string;
  category: {
    id: string;
    name: string;
  };
  subCategory?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateTicketResponse {
  message: string;
  data: TicketResponseData;
}
