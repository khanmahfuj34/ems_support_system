"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  UploadCloud,
  FileText,
  FileImage,
  File,
  X,
  AlertCircle,
} from "lucide-react";
import type { TicketAttachmentItem } from "../types/attachment.types";

interface TicketAttachmentsProps {
  attachments: TicketAttachmentItem[];
  onChange: (attachments: TicketAttachmentItem[]) => void;
  disabled?: boolean;
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB, matching the upload API

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function TicketAttachments({
  attachments,
  onChange,
  disabled = false,
}: TicketAttachmentsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useRef(new Map<string, string>());

  useEffect(() => {
    const currentIds = new Set(attachments.map((attachment) => attachment.id));
    for (const [id, url] of previewUrls.current) {
      if (!currentIds.has(id)) {
        URL.revokeObjectURL(url);
        previewUrls.current.delete(id);
      }
    }
  }, [attachments]);

  useEffect(
    () => () => {
      for (const url of previewUrls.current.values()) URL.revokeObjectURL(url);
      previewUrls.current.clear();
    },
  );

  const validateAndAddFiles = (files: FileList | File[]) => {
    setErrorMessage(null);
    const newItems: TicketAttachmentItem[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`"${file.name}" has an unsupported format. Only JPG, PNG, WEBP, and PDF are allowed.`);
        return;
      }

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        errors.push(`"${file.name}" has an unsupported file type. Choose a valid JPG, PNG, WEBP, or PDF file.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`"${file.name}" exceeds the maximum allowed size of 5 MB.`);
        return;
      }

      // Check if file is already added
      const exists = attachments.some(
        (a) => a.name === file.name && a.size === file.size,
      );
      if (exists) return;

      const id = `${file.name}-${file.size}-${Date.now()}-${newItems.length}`;
      const previewUrl = file.type.startsWith("image/") || file.type === "application/pdf"
        ? URL.createObjectURL(file)
        : undefined;
      if (previewUrl) previewUrls.current.set(id, previewUrl);

      newItems.push({
        id,
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatBytes(file.size),
        type: file.type,
        previewUrl,
        uploadStatus: "queued",
        uploadProgress: 0,
      });
    });

    if (errors.length > 0) {
      setErrorMessage(errors[0]);
    }

    if (newItems.length > 0) {
      onChange([...attachments, ...newItems]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  const getFileIcon = (fileName: string, mimeType: string) => {
    if (mimeType.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(fileName)) {
      return <FileImage className="size-4 text-blue-500" />;
    }
    if (mimeType.includes("pdf") || /\.pdf$/i.test(fileName)) {
      return <FileText className="size-4 text-red-500" />;
    }
    return <File className="size-4 text-amber-500" />;
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        disabled={disabled}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drag & drop dropzone matching reference image */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 select-none ${
          isDragging
            ? "border-blue-500 bg-blue-50/50 scale-[1.005]"
            : "border-gray-300 bg-white hover:border-blue-400 hover:bg-slate-50/50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="size-12 rounded-full flex items-center justify-center text-slate-500 mb-2.5">
          <UploadCloud className="size-9 stroke-[1.5] text-slate-500" />
        </div>

        <p className="text-sm text-gray-700 font-normal mb-1">
          Drag and drop files here, or{" "}
          <span className="text-blue-600 font-medium hover:underline">
            click to browse
          </span>
        </p>

        <p className="text-xs text-gray-400">
          Supported formats: JPG, PNG, WEBP, PDF (Max 5 MB per file)
        </p>
      </div>

      {/* Validation Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle className="size-4 shrink-0 text-red-500" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 p-0.5"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Attached Files List */}
      {attachments.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-medium text-gray-500">
            Attached Files ({attachments.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 p-2.5 rounded-lg border border-gray-200 bg-gray-50/60 hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                  <div className="size-10 rounded bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {file.previewUrl && file.type.startsWith("image/") ? (
                      <Image
                        src={file.previewUrl}
                        alt={`${file.name} preview`}
                        width={40}
                        height={40}
                        unoptimized
                        className="size-full object-cover"
                      />
                    ) : (
                      getFileIcon(file.name, file.type)
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium text-gray-800 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {file.formattedSize}
                    </p>
                    {file.previewUrl && file.type === "application/pdf" && (
                      <a
                        href={file.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Preview PDF
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {file.uploadStatus === "uploaded" ? (
                    <span className="text-[10px] font-medium text-emerald-700">Uploaded</span>
                  ) : file.uploadStatus === "uploading" ? (
                    <span className="text-[10px] font-medium text-blue-700">{file.uploadProgress}%</span>
                  ) : file.uploadStatus === "error" ? (
                    <span className="text-[10px] font-medium text-red-600">Failed</span>
                  ) : (
                    <span className="text-[10px] text-gray-400">Ready</span>
                  )}
                  <button
                    type="button"
                    disabled={disabled || file.uploadStatus === "uploading" || file.uploadStatus === "uploaded"}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment(file.id);
                    }}
                    className="size-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
                    title={file.uploadStatus === "uploaded" ? "Already attached to ticket" : "Remove file"}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                {file.uploadStatus === "uploading" && (
                  <div className="col-span-full h-1.5 overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={file.uploadProgress} aria-label={`Uploading ${file.name}`}>
                    <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${file.uploadProgress}%` }} />
                  </div>
                )}
                {file.uploadStatus === "error" && file.uploadError && (
                  <p className="col-span-full text-[11px] text-red-600" role="alert">{file.uploadError}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
