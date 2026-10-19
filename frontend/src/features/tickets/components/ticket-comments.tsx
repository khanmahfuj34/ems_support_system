"use client";

import React, { useMemo, useState } from "react";
import { MessageCircle, Send, Loader2, AlertCircle } from "lucide-react";

import type { TicketCommentData } from "../types/ticket.types";
import { addTicketComment, getTicketApiErrorMessage } from "../services/ticket.service";
import { useToast } from "@/components/ui/toaster";
import { USER_ROLE } from "@/features/auth/types/auth.types";

const MAX_COMMENT_LENGTH = 5000;

interface TicketCommentsProps {
  ticketId: string;
  initialComments: TicketCommentData[];
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatCommentDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function TicketComments({
  ticketId,
  initialComments,
}: TicketCommentsProps) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [comments, setComments] = useState<TicketCommentData[]>(initialComments);
  const [content, setContent] = useState("");
  const [contentError, setContentError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The API returns the oldest-first conversation; keep it that way after appends.
  const sortedComments = useMemo(
    () =>
      [...comments].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [comments],
  );

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
    if (contentError) setContentError(null);
    if (submitError) setSubmitError(null);
  };

  const validateContent = (value: string): string | null => {
    if (value.trim() === "") return "Reply cannot be empty.";
    if (value.length > MAX_COMMENT_LENGTH) {
      return `Reply must not exceed ${MAX_COMMENT_LENGTH} characters.`;
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateContent(content);
    if (validationError) {
      setContentError(validationError);
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setContentError(null);

    try {
      const response = await addTicketComment(ticketId, {
        content: content.trim(),
      });
      setComments((current) => [...current, response.data]);
      setContent("");
      showSuccessToast({
        title: "Reply sent",
        description: "Your reply was added to the ticket conversation.",
      });
    } catch (err) {
      const message = getTicketApiErrorMessage(
        err,
        "Failed to send your reply. Please try again.",
      );
      setSubmitError(message);
      showErrorToast({ title: "Reply failed", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section aria-label="Ticket conversation" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <MessageCircle className="size-4 text-[#2563EB]" />
          Conversation
          <span className="text-gray-400 font-medium">
            ({sortedComments.length})
          </span>
        </h2>
      </div>

      {/* Empty state */}
      {sortedComments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-10 text-center">
          <MessageCircle className="mx-auto size-6 text-gray-300" />
          <p className="mt-2 text-xs font-medium text-gray-500">
            No replies yet. Be the first to follow up on this ticket.
          </p>
        </div>
      ) : (
        <ol className="space-y-4">
          {sortedComments.map((comment) => {
            const isAdmin = comment.user.roleId === USER_ROLE.ADMIN;
            return (
              <li key={comment.id} className="flex items-start gap-3">
                <div
                  className={`size-8 rounded-full flex items-center justify-center font-semibold text-[11px] shrink-0 ${
                    isAdmin
                      ? "bg-[#2563EB] text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                  aria-hidden="true"
                >
                  {initialsFor(comment.user.name) || "?"}
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900 break-words">
                      {comment.user.name}
                    </span>
                    {isAdmin && (
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        Support Team
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">
                      {formatCommentDate(comment.createdAt)}
                    </span>
                  </div>
                  {/* Plain text only: React escapes the content automatically. */}
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Reply form */}
      <form onSubmit={handleSubmit} className="space-y-1.5">
        <label htmlFor="reply-content" className="block text-xs font-semibold text-gray-900">
          Reply
        </label>
        <textarea
          id="reply-content"
          value={content}
          onChange={handleContentChange}
          disabled={isSubmitting}
          rows={3}
          placeholder="Write a reply to follow up on this ticket..."
          aria-invalid={Boolean(contentError)}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 ${
            contentError
              ? "border-red-400 focus:ring-red-200"
              : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
          } disabled:opacity-60`}
        />
        <div className="flex items-center justify-between gap-3">
          {contentError ? (
            <p className="text-[11px] text-red-500 font-medium">{contentError}</p>
          ) : (
            <span className="text-[11px] text-gray-400">
              {content.length}/{MAX_COMMENT_LENGTH}
            </span>
          )}
        </div>

        {submitError && (
          <div
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800"
            role="alert"
          >
            <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[11px]">{submitError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-medium transition-colors shadow-xs flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5 rotate-45" />
            )}
            <span>{isSubmitting ? "Sending Reply..." : "Send Reply"}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
