import { describe, expect, it } from 'vitest';
import {
  configureMarkdownRenderer,
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

  it('renders GFM tables with alignment and escapes cell content', () => {
    const html = renderMarkdown([
      '| Name | Qty | Note |',
      '| :--- | ---: | :---: |',
      '| Bolt | 12 | **ok** |',
      '| <script>x</script> | 3 | fine |',
    ].join('\n'));

    expect(html).toContain('<table><thead><tr>');
    expect(html).toContain('<th align="left">Name</th>');
    expect(html).toContain('<th align="right">Qty</th>');
    expect(html).toContain('<th align="center">Note</th>');
    expect(html).toContain('<td align="left">Bolt</td>');
    expect(html).toContain('<strong>ok</strong>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script');

    // A pipe line without a separator row stays a paragraph.
    expect(renderMarkdown('| not a table |')).not.toContain('<table>');
  });

  it('renders task lists as disabled checkboxes', () => {
    const html = renderMarkdown(['- [x] shipped', '- [ ] pending'].join('\n'));

    expect(html).toContain('<ul class="lite-task-list">');
    expect(html).toContain('<input type="checkbox" disabled checked />');
    expect(html).toContain('<input type="checkbox" disabled />');
    expect(html).toContain('shipped');
    expect(html).toContain('pending');
    expect(html).not.toContain('[x]');
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

  it('allows tables and checkbox inputs but never other input types', () => {
    const html = sanitizeRichTextHtml(
      '<table><thead><tr><th align="left">A</th></tr></thead><tbody><tr><td align="right">1</td></tr></tbody></table>'
      + '<input type="checkbox" checked onchange="x">'
      + '<input type="text" value="leak">',
    );

    expect(html).toContain('<table><thead><tr><th align="left">A</th>');
    expect(html).toContain('<td align="right">1</td>');
    expect(html).toContain('<input type="checkbox" checked />');
    expect(html).not.toContain('onchange');
    expect(html).not.toContain('type="text"');
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

describe('Lite markdown highlighting hook', () => {
  it('delegates fenced blocks to a trusted highlighter with the language', () => {
    const calls: Array<[string, string]> = [];
    const html = renderMarkdown(['```ts', 'const a = 1;', '```'].join('\n'), {
      highlight: (code, language) => {
        calls.push([code, language]);
        return `<span class="tok-keyword">const</span> ${escapeHtml(code.slice(6))}`;
      },
      codeBlockClass: 'lite-code-block',
    });

    expect(calls).toEqual([['const a = 1;', 'ts']]);
    expect(html).toContain('<pre class="lite-code-block"><code class="language-ts">');
    expect(html).toContain('<span class="tok-keyword">const</span>');
    expect(html).toContain('a = 1;');
  });

  it('falls back to escaped code when the highlighter declines or has no language', () => {
    const declined = renderMarkdown(['```ts', 'a < b', '```'].join('\n'), {
      highlight: () => undefined,
    });
    expect(declined).toContain('a &lt; b');
    expect(declined).toContain('<code class="language-ts">');

    const noLanguage = renderMarkdown(['```', 'a < b', '```'].join('\n'), {
      highlight: () => '<b>should not run</b>',
    });
    expect(noLanguage).not.toContain('should not run');
    expect(noLanguage).toContain('a &lt; b');
  });

  it('supports app-wide configuration that can be restored', () => {
    const previous = configureMarkdownRenderer({
      highlight: (code) => `<mark>${escapeHtml(code)}</mark>`,
    });
    try {
      expect(renderMarkdown(['```js', 'x()', '```'].join('\n'))).toContain('<mark>x()</mark>');
      // Per-call options win over the app-wide default.
      expect(renderMarkdown(['```js', 'x()', '```'].join('\n'), { highlight: undefined }))
        .toContain('<code class="language-js">x()</code>');
    } finally {
      configureMarkdownRenderer(previous);
    }
    expect(renderMarkdown(['```js', 'x()', '```'].join('\n'))).not.toContain('<mark>');
  });

  it('does not let the highlighter affect inline code', () => {
    const html = renderMarkdown('`inline`', { highlight: () => '<b>raw</b>' });

    expect(html).toContain('<code>inline</code>');
    expect(html).not.toContain('<b>raw</b>');
  });
});
