import { stripHtmlTags } from './sanitize-html.js';

export const TICKET_DESCRIPTION_PREVIEW_LENGTH = 200;

export interface TicketDescriptionTextFields {
  plainText: string;
  preview: string;
}

/**
 * Produces the searchable plain text and bounded list preview from sanitized
 * ticket HTML. The preview never contains a partial HTML tag or word.
 */
export function buildTicketDescriptionTextFields(
  sanitizedHtml: string,
): TicketDescriptionTextFields {
  const plainText = stripHtmlTags(sanitizedHtml);

  const characters = Array.from(plainText);
  if (characters.length <= TICKET_DESCRIPTION_PREVIEW_LENGTH) {
    return { plainText, preview: plainText };
  }

  const prefix = characters.slice(0, TICKET_DESCRIPTION_PREVIEW_LENGTH + 1);
  let boundary = -1;
  for (let index = prefix.length - 1; index >= 0; index -= 1) {
    if (/\s/.test(prefix[index])) {
      boundary = index;
      break;
    }
  }

  return {
    plainText,
    // An unusually long unbroken token has no valid word-boundary preview.
    preview: boundary > 0 ? prefix.slice(0, boundary).join('') : '',
  };
}
