import DOMPurify, { type Config } from 'isomorphic-dompurify';
import { decodeHTML } from 'entities';

/**
 * Strict allowlist matching exactly what the Tiptap editor emits for
 * ticket descriptions (StarterKit nodes/marks + Link, minus unsupported
 * extras like images, whose only legitimate source is the attachments API).
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'strong',
  'em',
  'u',
  's',
  'a',
];

const ALLOWED_ATTR = ['href'];

const SANITIZE_OPTIONS: Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: true,
  KEEP_CONTENT: true,
};

/**
 * Strips scripts, event handlers, javascript:/data: URLs, iframes, style
 * and any other element not emitted by the ticket rich-text editor.
 *
 * Should be applied before persisting rich text (PRD: the backend must
 * sanitize all rich text), so the database never stores unsafe HTML.
 */
export function sanitizeTicketDescription(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_OPTIONS);
}

/**
 * Returns the visible text content of a sanitized rich-text string.
 * Used to enforce that a description still contains real text.
 */
export function stripHtmlTags(html: string): string {
  return decodeHTML(
    html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|h[1-6]|li|blockquote|pre|div)>/gi, ' ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim();
}
