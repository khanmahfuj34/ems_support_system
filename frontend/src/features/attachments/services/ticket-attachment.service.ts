import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { TicketAttachmentUploadResponse } from "../types/attachment.types";

export async function uploadTicketAttachment(
  file: File,
  ticketId: string,
  onProgress: (progress: number) => void,
): Promise<TicketAttachmentUploadResponse["data"]> {
  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("ticketId", ticketId);

  const { data } = await apiClient.post<TicketAttachmentUploadResponse>(
    API_ENDPOINTS.uploads.create,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total) {
          onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        }
      },
    },
  );

  return data.data;
}
