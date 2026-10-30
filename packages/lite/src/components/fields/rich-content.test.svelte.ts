import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  renderInlineMarkdown,
  renderMarkdown,
  renderRichContent,
  sanitizeRichTextHtml,
} from '../../rich-content';

describe('Lite markdown renderer', () => {
  it('renders headings, emphasis, lists, quotes and rules', () => {
    const html = renderMarkdown([
      '# Title',
      '',
      'Some **bold** and *italic* and `code`.',
      '',
      '- one',
      '- two',
      '',
      '1. first',
      '2. second',
      '',
      '> quoted',
      '',
      '---',
    ].join('\n'));

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
    expect(html).toContain('<ol><li>first</li><li>second</li></ol>');
    expect(html).toContain('<blockquote><p>quoted</p></blockquote>');
    expect(html).toContain('<hr />');
  });

  it('escapes raw HTML and neutralizes unsafe link schemes', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toContain('&lt;script&gt;');
    expect(renderMarkdown('<img src=x onerror=alert(1)>')).not.toContain('<img');

    const unsafe = renderInlineMarkdown('[click](javascript:alert(1))');
    expect(unsafe).not.toContain('href');
    expect(unsafe).toContain('click');

    const safe = renderInlineMarkdown('[docs](https://example.test/a?b=1&c=2)');
    expect(safe).toContain('href="https://example.test/a?b=1&amp;c=2"');
    expect(safe).toContain('rel="noreferrer"');

    const relative = renderInlineMarkdown('[page](/lite/orders)');
    expect(relative).toContain('href="/lite/orders"');

    expect(renderInlineMarkdown('`<b>not bold</b>`')).toBe('<code>&lt;b&gt;not bold&lt;/b&gt;</code>');
    expect(escapeHtml('a"b\'c<d>&')).toBe('a&quot;b&#39;c&lt;d&gt;&amp;');
  });

  it('keeps fenced code blocks verbatim and escaped', () => {
    const html = renderMarkdown(['```ts', 'const a = "<b>";', '```'].join('\n'));

    expect(html).toContain('<pre><code class="language-ts">');
    expect(html).toContain('const a = &quot;&lt;b&gt;&quot;;');
    expect(html).not.toContain('<b>');
  });

  it('keeps unsupported syntax literal instead of dropping content', () => {
    expect(renderMarkdown('| a | b |')).toContain('| a | b |');
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown(null)).toBe('');
  });
});

describe('Lite rich text sanitizer', () => {
  it('keeps allowlisted formatting and drops everything else', () => {
    const html = sanitizeRichTextHtml(
      '<p>Hello <strong>world</strong><script>alert(1)</script></p>'
      + '<p onclick="alert(1)">Click <a href="https://example.test">here</a></p>'
      + '<div class="x">block</div><iframe src="https://evil.test"></iframe>',
    );

    expect(html).toContain('<p>Hello <strong>world</strong></p>');
    expect(html).toContain('<p>Click <a href="https://example.test" rel="noreferrer">here</a></p>');
    expect(html).toContain('block');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<div');
    expect(html).not.toContain('<iframe');
  });

  it('rejects unsafe attribute values and keeps alt text escaped', () => {
    const html = sanitizeRichTextHtml(
      '<a href="javascript:alert(1)">bad</a><img src="javascript:alert(1)" alt=\'a "quote"\' onerror="x">',
    );

    expect(html).toContain('<a>bad</a>');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('onerror');
    expect(html).toContain('alt="a &quot;quote&quot;"');
  });

  it('escapes stray angle brackets and comments', () => {
    const html = sanitizeRichTextHtml('1 < 2 <!-- hidden --> and 3 > 2');

    expect(html).toBe('1 &lt; 2  and 3 &gt; 2');
  });

  it('picks the renderer from the stored shape', () => {
    expect(renderRichContent('<p>rich</p>')).toBe('<p>rich</p>');
    expect(renderRichContent('# markdown')).toContain('<h1>markdown</h1>');
    expect(renderRichContent('')).toBe('');
  });
});