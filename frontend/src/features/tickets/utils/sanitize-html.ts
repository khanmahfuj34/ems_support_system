import DOMPurify, { type Config } from "dompurify";

/**
 * Strict allowlist mirroring the backend ticket sanitizer
 * (backend/src/module/tickets/utils/sanitize-html.ts), so client-side
 * rendering never injects HTML the server would not have stored.
 */
const SANITIZE_OPTIONS: Config = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "h1",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "strong",
    "em",
    "u",
    "s",
    "a",
  ],
  ALLOWED_ATTR: ["href"],
  ALLOW_DATA_ATTR: false,
};

export function sanitizeTicketDescription(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, SANITIZE_OPTIONS);
}

export function stripHtmlTags(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|h[1-6]|li|blockquote|pre|div)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
