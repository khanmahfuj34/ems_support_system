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
