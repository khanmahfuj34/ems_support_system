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
  previewUrl?: string;
  uploadStatus: "queued" | "uploading" | "uploaded" | "error";
  uploadProgress: number;
  attachmentId?: string;
  fileUrl?: string;
  uploadError?: string;
}

export interface TicketAttachmentUploadResponse {
  success: boolean;
  data: {
    id: string;
    ticketId: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: string;
  };
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

export interface TicketDetailCategory {
  id: string;
  name: string;
}

export interface TicketDetailSlaPolicy {
  id: string;
  priority: TicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
}

export interface TicketDetailStatus {
  id: number;
  name: string;
}

export interface TicketAttachmentData {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: string;
  createdAt: string;
}

export interface TicketStatusHistoryEntry {
  id: string;
  oldStatusId: number | null;
  newStatusId: number;
  reason: string | null;
  createdAt: string;
  oldStatus: { id: number; name: string } | null;
  newStatus: { id: number; name: string };
  actor: { id: string; name: string };
}

export interface TicketDetailData {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  userId: string;
  categoryId: string;
  subCategoryId: string | null;
  userPriority: TicketPriority;
  adminPriority: TicketPriority | null;
  statusId: number;
  slaStatus: number;
  rejectionReason: string | null;
  resolutionSummary: string | null;
  firstResponseAt: string | null;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: TicketDetailCategory | null;
  subCategory: TicketDetailCategory | null;
  status: TicketDetailStatus | null;
  slaPolicy: TicketDetailSlaPolicy | null;
  statusHistory: TicketStatusHistoryEntry[];
  comments: TicketCommentData[];
  attachments: TicketAttachmentData[];
}

export interface TicketDetailResponse {
  message: string;
  data: TicketDetailData;
}

export interface TicketCommentData {
  id: string;
  ticketId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    roleId: number;
  };
}

export interface CreateCommentInput {
  content: string;
}

export interface ListCommentsResponse {
  message: string;
  data: TicketCommentData[];
}

export interface AddCommentResponse {
  message: string;
  data: TicketCommentData;
}
