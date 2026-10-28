import {
  sanitizeTicketDescription,
  stripHtmlTags,
} from './sanitize-html.js';

describe('sanitizeTicketDescription', () => {
  it('keeps formatting emitted by the Tiptap editor', () => {
    const html = [
      '<h2>Summary</h2>',
      '<p><strong>Bold</strong> <em>italic</em> <u>underline</u> text</p>',
      '<ol><li>first</li><li>second</li></ol>',
      '<blockquote>quoted</blockquote>',
      '<p><a href="https://example.com">link</a></p>',
    ].join('');

    expect(sanitizeTicketDescription(html)).toBe(html);
  });

  it('keeps bullet lists, paragraphs and line breaks', () => {
    const html = '<ul><li>one</li><li>two</li></ul><p>a<br>b</p>';

    expect(sanitizeTicketDescription(html)).toBe(html);
  });

  it('removes script tags and their content', () => {
    const result = sanitizeTicketDescription(
      '<p>hello</p><script>alert(1)</script>',
    );

    expect(result).toContain('hello');
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert(1)');
  });

  it('removes event handler attributes', () => {
    const result = sanitizeTicketDescription(
      '<p onclick="alert(1)" onmouseover="alert(2)">hello</p>',
    );

    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onmouseover');
    expect(result).toContain('hello');
  });

  it('raises javascript: URLs to safe values', () => {
    const result = sanitizeTicketDescription(
      '<a href="javascript:alert(1)">click</a>',
    );

    expect(result).not.toContain('javascript:');
  });

  it('removes disallowed elements such as iframes and styles', () => {
    const result = sanitizeTicketDescription(
      '<p>ok</p><iframe src="https://evil.example"></iframe><style>body{}</style>',
    );

    expect(result).not.toContain('iframe');
    expect(result).not.toContain('style');
    expect(result).not.toContain('evil.example');
    expect(result).toContain('ok');
  });

  it('rejects a description of only a script tag', () => {
    const sanitized = sanitizeTicketDescription('<script>alert(1)</script>');

    expect(stripHtmlTags(sanitized)).toBe('');
  });
});

describe('stripHtmlTags', () => {
  it('extracts visible text across block elements', () => {
    expect(stripHtmlTags('<h1>Head</h1><p>One <strong>two</strong></p>')).toBe(
      'Head One two',
    );
  });

  it('treats br as whitespace', () => {
    expect(stripHtmlTags('a<br>b')).toBe('a b');
  });

  it('collapses whitespace', () => {
    expect(stripHtmlTags('<p>  spaced   out  </p>')).toBe('spaced out');
  });

  it('collapses newlines, tabs, and non-breaking spaces and decodes entities', () => {
    expect(stripHtmlTags('<p>first\n\tsecond&nbsp;&amp; third</p>')).toBe(
      'first second & third',
    );
  });
});
