"use client";

import { useState } from "react";

import type { TicketAttachmentItem } from "../types/attachment.types";
import { uploadTicketAttachment } from "../services/ticket-attachment.service";
import { getApiErrorMessage } from "@/lib/api/api-errors";

const UPLOAD_FAILED_MESSAGE = "Upload failed. You can retry this file or remove it.";

/**
 * Manages the pending attachment list of a ticket form and the sequential
 * upload of queued files to the uploads API.
 */
export function useAttachmentBatch() {
  const [attachments, setAttachments] = useState<TicketAttachmentItem[]>([]);
  const hasPendingAttachments = attachments.some(
    (attachment) => attachment.uploadStatus !== "uploaded",
  );

  const uploadPendingAttachments = async (
    ticketId: string,
    pending: TicketAttachmentItem[],
  ): Promise<boolean> => {
    let allUploadsSucceeded = true;

    for (const attachment of pending.filter(
      (file) => file.uploadStatus !== "uploaded",
    )) {
      setAttachments((current) =>
        current.map((file) =>
          file.id === attachment.id
            ? { ...file, uploadStatus: "uploading", uploadProgress: 0, uploadError: undefined }
            : file,
        ),
      );

      try {
        const uploaded = await uploadTicketAttachment(
          attachment.file,
          ticketId,
          (progress) => {
            setAttachments((current) =>
              current.map((file) =>
                file.id === attachment.id ? { ...file, uploadProgress: progress } : file,
              ),
            );
          },
        );

        if (uploaded.ticketId !== ticketId) {
          throw new Error("The server associated this upload with a different ticket.");
        }

        setAttachments((current) =>
          current.map((file) =>
            file.id === attachment.id
              ? {
                  ...file,
                  uploadStatus: "uploaded",
                  uploadProgress: 100,
                  attachmentId: uploaded.id,
                  fileUrl: uploaded.fileUrl,
                  uploadError: undefined,
                }
              : file,
          ),
        );
      } catch (error) {
        allUploadsSucceeded = false;
        setAttachments((current) =>
          current.map((file) =>
            file.id === attachment.id
              ? {
                  ...file,
                  uploadStatus: "error",
                  uploadError: getApiErrorMessage(error, UPLOAD_FAILED_MESSAGE),
                }
              : file,
          ),
        );
      }
    }

    return allUploadsSucceeded;
  };

  return { attachments, setAttachments, hasPendingAttachments, uploadPendingAttachments };
}
