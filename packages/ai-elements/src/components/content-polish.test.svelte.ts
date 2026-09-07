import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lex, type Extension } from 'streamdown-svelte';
import Response from './Response.svelte';
import Tool from './Tool.svelte';
import ContentPolishHost from './content-polish.test-host.svelte';
import { createResponseHtmlPreparer } from './message/content-polish-html.js';
import { focusScrollableContent } from './tool/content-polish-scroll-region.js';

const prepareResponseHtml = createResponseHtmlPreparer();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const literalFences = [
  ['shorter nested fence', '````md\n```html\n<div>literal &amp;</div>\n```\n````'],
  ['mismatched marker', '```html\n~~~\n<img src=x onerror=alert(1)>\n```'],
  ['longer closing fence', '```html\n<div>literal</div>\n`````'],
  ['closing marker with text', '```html\n``` not a close\n<div>literal</div>\n```'],
  ['tilde fence', '~~~~html\n~~~\n<div>literal</div>\n~~~~'],
  ['inline code', 'Use `<div>&amp;</div>` and `` `<img src=x>` ``.'],
  ['multiline inline code', 'Use ``<span>\n`literal`\n</span>``.'],
  ['unfinished fence', '````html\n```\n<div>still streaming</div>'],
  ['quoted unfinished fence', '> ```html\n> <div>literal &amp;</div>'],
  ['quoted tilde fence', '> ~~~~html\n> ~~~\n> <div>literal &amp;</div>\n> ~~~~'],
  ['list-nested unfinished fence', '- item\n\n  ```html\n  <div>literal &amp;</div>'],
  ['nested list fence', '- outer\n  - inner\n\n    ~~~~html\n    ~~~\n    <div>literal &amp;</div>\n    ~~~~'],
  ['indented code', '    <div>literal &amp;</div>\n    <img src=x>'],
  ['tab-indented code', '\t<div>literal &amp;</div>'],
  ['quoted indented code', '>     <div>literal &amp;</div>'],
  ['list-nested indented code', '- item\n\n      <div>literal &amp;</div>'],
  ['literal entities', '```html\n<div>&lt; &#60; &#060; &gt; &#62; &#062; &amp;</div>\n```'],
  ['inline literal entities', 'Use `<div>&lt; &#60; &#060; &amp;</div>`.'],
] as const;

function literalTokens(content: string, extensions: Extension[] = []) {
  const result: { type: string; text: string }[] = [];
  function visit(tokens: { type: string; text?: string; tokens?: unknown }[]) {
    for (const token of tokens) {
      if (token.type === 'code' || token.type === 'codespan') {
        result.push({ type: token.type, text: token.text ?? '' });
      }
      if (Array.isArray(token.tokens)) visit(token.tokens);
    }
  }
  visit(lex(content, extensions));
  return result;
}

describe('content polish HTML escaping', () => {
  it.each(literalFences)('preserves %s', (_, markdown) => {
    const response = prepareResponseHtml(markdown);
    const expected = literalTokens(markdown);
    expect(expected.length).toBeGreaterThan(0);
    expect(literalTokens(response.content, response.extensions)).toEqual(expected);
  });

  it('escapes prose after a longer closing fence without modifying code', () => {
    const markdown = '```html\n<div>literal</div>\n`````\n<img src=x onerror=alert(1)>';
    const response = prepareResponseHtml(markdown);
    expect(response.content).not.toContain('<img');
    expect(literalTokens(response.content, response.extensions)).toEqual(literalTokens(markdown));
  });

  it('does not treat invalid opening fences or escaped backticks as code', () => {
    for (const content of ['```not`a fence\n<img src=x>', '\\`<img src=x>']) {
      const response = prepareResponseHtml(content);
      expect(response.content).not.toContain('<img');
      expect(literalTokens(response.content, response.extensions)).toEqual([]);
    }
  });

  it('preserves CRLF code and escapes adjacent prose', () => {
    const content = '~~~html\r\n<div>literal</div>\r\n~~~\r\n<b>text</b>';
    const response = prepareResponseHtml(content);
    expect(response.content.match(/\r\n/g)).toHaveLength(3);
    expect(response.content).not.toContain('<b>');
    expect(literalTokens(response.content, response.extensions)).toEqual(literalTokens(content));
  });

  it('does not turn indented paragraph continuation into a code block', () => {
    const response = prepareResponseHtml('Paragraph\n    <span>still prose</span>');
    expect(literalTokens(response.content, response.extensions)).toEqual([]);
  });

  it('reuses parser extensions while streaming and changes them when escape references collide', () => {
    const prepare = createResponseHtmlPreparer();
    const first = prepare('```html\n<div>');
    const second = prepare('```html\n<div>longer');
    expect(second.extensions).toBe(first.extensions);
    const collision = prepare('```html\n<div>&#60;');
    expect(collision.extensions).not.toBe(first.extensions);
    expect(literalTokens(first.content, first.extensions)).toEqual([{ type: 'code', text: '<div>' }]);
    expect(literalTokens(collision.content, collision.extensions)).toEqual([{ type: 'code', text: '<div>&#60;' }]);
  });

  it('does not mutate caller extensions and retains custom code precedence', () => {
    const tokenizer: Extension['tokenizer'] = function (source) {
      const token = this.lexer.options.tokenizer?.fences(source);
      return token ? { ...token, text: `custom: ${token.text}` } : undefined;
    };
    const extension: Extension = { name: 'custom-code', level: 'block', tokenizer };
    const response = prepareResponseHtml('```html\n<div>literal</div>\n```', [extension]);
    expect(literalTokens(response.content, response.extensions)).toEqual([
      { type: 'code', text: 'custom: <div>literal</div>' },
    ]);
    expect(extension.tokenizer).toBe(tokenizer);
    expect(extension).toEqual({ name: 'custom-code', level: 'block', tokenizer });
  });

  it('leaves generated custom code entities untouched when their source has no escaped tags', () => {
    const extension: Extension = {
      name: 'generated-code',
      level: 'block',
      tokenizer(source) {
        return source.startsWith('::code')
          ? { type: 'code', raw: '::code', text: '&#60; &lt;' }
          : undefined;
      },
    };
    const response = prepareResponseHtml('::code\n\n<b>prose</b>', [extension]);
    expect(literalTokens(response.content, response.extensions)).toEqual([
      { type: 'code', text: '&#60; &lt;' },
    ]);
  });
});

describe('content polish Response integration', () => {
  it.each(literalFences.filter(([, content]) => literalTokens(content).some(token => token.type === 'code')))(
    'copies exact literal code with %s',
    async (_, content) => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
      const { container } = render(Response, { content });
      for (const button of screen.getAllByRole('button', { name: 'Copy code' })) await fireEvent.click(button);
      expect(writeText.mock.calls.map(call => call[0])).toEqual(
        literalTokens(content).filter(token => token.type === 'code').map(token => token.text),
      );
      expect(container.querySelector('img, script')).toBeNull();
    },
  );

  it('keeps inline HTML code literal and surrounding raw HTML inert', () => {
    const { container } = render(Response, {
      content: 'Use `` `<img src=x>` `` and `<div>&amp;</div>` <img src=x onerror=alert(1)> **safe**',
    });
    expect(Array.from(container.querySelectorAll('code'), node => node.textContent)).toEqual([
      '`<img src=x>`', '<div>&amp;</div>',
    ]);
    expect(container.querySelector('img, script')).toBeNull();
    expect(screen.getByText('safe')).not.toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('preserves streamed nested fences through completion and copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { container, rerender } = render(Response, { content: '````html\n', streaming: true });
    for (const content of [
      '````html\n```',
      '````html\n```\n<div',
      '````html\n```\n<div>literal &amp;</div>',
      '````html\n```\n<div>literal &amp;</div>\n```',
      '````html\n```\n<div>literal &amp;</div>\n```\n````',
    ]) {
      await rerender({ content, streaming: true });
      expect(container.querySelector('pre code')).not.toBeNull();
      expect(container.querySelector('pre code')?.textContent).not.toContain('&lt;');
      expect(container.querySelector('img, script')).toBeNull();
    }
    await rerender({
      content: '````html\n```\n<div>literal &amp;</div>\n```\n````\n\n<img src=x onerror=alert(1)> **Done**',
      streaming: false,
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith('```\n<div>literal &amp;</div>\n```');
    expect(screen.getByText('Done')).not.toBeNull();
    expect(container.querySelector('img, script')).toBeNull();
  });

  it.each([
    ['quoted', '> ~~~~html\n> ', '\n> ~~~~'],
    ['nested list', '- outer\n  - inner\n\n    ~~~~html\n    ', '\n    ~~~~'],
  ])('preserves %s code during streaming and after fence completion', async (_, opening, closing) => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { container, rerender } = render(Response, { content: opening, streaming: true });
    for (const code of ['<div', '<div>literal', '<div>literal &amp; &#60;</', '<div>literal &amp; &#60;</div>']) {
      await rerender({ content: opening + code, streaming: true });
      expect(container.querySelector('pre code')?.textContent).toContain(code);
      expect(container.querySelector('img, script')).toBeNull();
    }
    await rerender({
      content: opening + '<div>literal &amp; &#60;</div>' + closing + '\n\n<b>done</b>',
      streaming: false,
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith('<div>literal &amp; &#60;</div>');
    expect(container.textContent).toContain('<b>done</b>');
    expect(container.querySelector('b')).toBeNull();
  });

  it('keeps raw HTML literal with skipHtml disabled and forwards extensions and renderer options', () => {
    const customTokenizer = vi.fn<Extension['tokenizer']>(function (source) {
      return source.startsWith('::badge::')
        ? { type: 'strong', raw: '::badge::', text: 'Custom badge', tokens: [{ type: 'text', raw: 'Custom badge', text: 'Custom badge' }] }
        : undefined;
    });
    const renderHtml = vi.fn(() => '<img src=x>');
    const { container } = render(Response, {
      content: '<div>**safe**</div>\n\n<Widget /> <img src=x onerror=alert(1)> <script>alert(1)</script>\n\n::badge::\n\n```html\n<b>literal</b>\n```',
      skipHtml: false,
      renderHtml,
      extensions: [{ name: 'custom-badge', level: 'inline', tokenizer: customTokenizer }],
      class: 'host-response',
      dir: 'rtl',
      controls: false,
    });
    expect(screen.getByText('safe')).not.toBeNull();
    expect(screen.getByText('Custom badge')).not.toBeNull();
    expect(customTokenizer).toHaveBeenCalled();
    expect(renderHtml).not.toHaveBeenCalled();
    expect(container.querySelector('.host-response')).not.toBeNull();
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull();
    expect(container.querySelector('img, script, widget, b')).toBeNull();
    expect(container.textContent).toContain('<div>safe</div>');
    expect(container.textContent).toContain('<Widget />');
    expect(container.textContent).toContain('<script>alert(1)</script>');
    expect(screen.queryByRole('button', { name: 'Copy code' })).toBeNull();
  });
});

describe('content polish tool disclosure', () => {
  it('keeps details lazy and synchronizes native toggle only on a state change', async () => {
    const onOpenChange = vi.fn();
    const { container } = render(Tool, { name: 'lookup', input: 'parameters', onOpenChange });
    const details = container.querySelector('details');
    if (!details) throw new Error('Expected Tool to render native details.');
    expect(container.querySelector('summary')).not.toBeNull();
    expect(screen.queryByText('parameters')).toBeNull();
    await fireEvent(details, new Event('toggle'));
    expect(onOpenChange).not.toHaveBeenCalled();

    details.open = true;
    await fireEvent(details, new Event('toggle'));
    await waitFor(() => expect(screen.getByText('parameters')).not.toBeNull());
    await fireEvent(details, new Event('toggle'));
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);

    details.open = false;
    await fireEvent(details, new Event('toggle'));
    expect(screen.queryByText('parameters')).toBeNull();
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it('updates collapsed status without opening the details or losing error output', async () => {
    const { container, rerender } = render(Tool, { name: 'lookup', state: 'input-streaming' });
    for (const [state, label] of [
      ['input-streaming', 'Pending'],
      ['input-available', 'Running'],
      ['output-available', 'Completed'],
      ['output-error', 'Error'],
    ] as const) {
      await rerender({ name: 'lookup', state });
      expect(screen.getByRole('status').textContent).toContain(label);
      expect(container.querySelector('details')?.open).toBe(false);
    }
    await rerender({ state: 'output-error', errorText: 'Failure details', open: true });
    expect(container.querySelector('[data-error="true"]')?.textContent).toContain('Failure details');
    expect(screen.getByRole('region', { name: 'Tool error' }).textContent).toBe('Failure details');
  });

  it('does not report controlled open changes back as user interactions', async () => {
    const onOpenChange = vi.fn();
    const { container, rerender } = render(Tool, { onOpenChange, open: false });
    await rerender({ open: true });
    const details = container.querySelector('details');
    if (!details) throw new Error('Expected Tool to render native details.');
    await fireEvent(details, new Event('toggle'));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('keeps approval explicit and disables unavailable callbacks', async () => {
    const onapprove = vi.fn();
    const onreject = vi.fn();
    const { rerender } = render(Tool, { state: 'approval-requested', open: true });
    expect((screen.getByRole('button', { name: 'Approve' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Reject' }) as HTMLButtonElement).disabled).toBe(true);
    await rerender({ onapprove, onreject });
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onapprove).toHaveBeenCalledOnce();
    expect(onreject).toHaveBeenCalledOnce();
  });

  it('uses the same status, error, and focusable value regions in compound tools', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(100);
    const { container } = render(ContentPolishHost);
    expect(container.querySelector('[data-testid="compound"] summary')).not.toBeNull();
    const name = container.querySelector('[data-testid="compound"] summary strong');
    expect(name?.getAttribute('title')).toBe(name?.textContent);
    expect(container.querySelector('[data-testid="compound"] [data-error="true"]')).not.toBeNull();
    expect(screen.getAllByLabelText('Tool parameters').every(node => node.getAttribute('tabindex') === '0')).toBe(true);
    expect(Array.from(container.querySelectorAll('[data-slot="tool-status-badge"]'))
      .every(node => node.getAttribute('role') === 'status' && node.getAttribute('aria-live') === 'polite')).toBe(true);
  });

  it('makes overflowing values keyboard reachable and removes redundant tab stops after updates', async () => {
    const node = document.createElement('pre');
    let height = 100;
    Object.defineProperties(node, {
      scrollHeight: { get: () => height },
      clientHeight: { value: 20 },
    });
    const action = focusScrollableContent(node);
    expect(node.tabIndex).toBe(0);
    height = 10;
    node.textContent = 'short';
    await waitFor(() => expect(node.hasAttribute('tabindex')).toBe(false));
    height = 100;
    node.textContent = 'long';
    await waitFor(() => expect(node.tabIndex).toBe(0));
    action.destroy();
    height = 10;
    node.textContent = 'after cleanup';
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(node.tabIndex).toBe(0);
  });
});
