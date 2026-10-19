"use client";

import React, { useMemo } from "react";
import { sanitizeTicketDescription } from "../utils/sanitize-html";

interface RichTextContentProps {
  /** Saved rich-text HTML (e.g. from the tickets API). Sanitized before render. */
  html: string;
  className?: string;
}

/**
 * XSS-safe renderer for saved rich-text content.
 *
 * Tiptap HTML coming from the API is only ever rendered through
 * DOMPurify with a strict allowlist — never unsanitized via
 * dangerouslySetInnerHTML.
 */
export function RichTextContent({ html, className }: RichTextContentProps) {
  const sanitized = useMemo(() => sanitizeTicketDescription(html), [html]);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: sanitized }}
      className={`text-sm text-gray-800 [&_a]:text-blue-600 [&_a]:underline [&_a]:font-medium [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:text-blue-600 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:font-mono [&_pre]:text-xs [&_pre]:my-2 [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-5 ${className ?? ""}`}
    />
  );
}
