import { buildTicketDescriptionTextFields } from './ticket-description-text.js';

describe('buildTicketDescriptionTextFields', () => {
  it('returns plain text and a preview without HTML tags', () => {
    expect(
      buildTicketDescriptionTextFields(
        '<p>Visible <strong>ticket</strong> description</p>',
      ),
    ).toEqual({
      plainText: 'Visible ticket description',
      preview: 'Visible ticket description',
    });
  });

  it('limits long previews to a complete word within 200 characters', () => {
    const { plainText, preview } = buildTicketDescriptionTextFields(
      `<p>${'description '.repeat(30)}</p>`,
    );

    expect(plainText).toBe('description '.repeat(30).trim());
    expect(preview.length).toBeLessThanOrEqual(200);
    expect(preview).not.toContain('<');
    expect(preview).toBe('description '.repeat(16).trim());
  });

  it('does not split a single unbroken word to make a preview', () => {
    const { preview } = buildTicketDescriptionTextFields(
      `<p>${'x'.repeat(250)}</p>`,
    );

    expect(preview).toBe('');
  });

  it('returns empty plain text and preview for empty or tag-only HTML', () => {
    expect(buildTicketDescriptionTextFields('<p></p>')).toEqual({
      plainText: '',
      preview: '',
    });
  });

  it('preserves Bangla text and keeps a multi-byte emoji intact at the word boundary', () => {
    const emoji = '\u{1F600}';
    const bangla = '\u09AC\u09BE\u0982\u09B2\u09BE';
    const description = `<p>${'a '.repeat(99)}${emoji} ${bangla} ${bangla.repeat(20)}</p>`;
    const { plainText, preview } = buildTicketDescriptionTextFields(description);

    expect(plainText).toContain(`${emoji} ${bangla}`);
    expect(preview).toBe(`${'a '.repeat(99)}${emoji}`);
    expect(Array.from(preview)).toHaveLength(199);
  });
});
