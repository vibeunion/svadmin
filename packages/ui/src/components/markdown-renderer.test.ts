import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MarkdownRenderer from './MarkdownRenderer.svelte';

// MarkdownRenderer loads its optional peer deps (marked, highlight.js,
// isomorphic-dompurify) dynamically on mount, so rendering is asynchronous.
// Wait until markdown has actually been parsed and rendered (presence of a
// rendered <a>/<pre> element signals the deps resolved and parsing ran).
async function waitForMarkdown(container: HTMLElement) {
  await waitFor(() => {
    expect(container.querySelector('a, pre, .code-block-wrapper')).not.toBeNull();
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MarkdownRenderer security and enhancement', () => {
  // isomorphic-dompurify/marked/highlight.js are dynamic peer deps; first
  // mount pays an init cost that can exceed the default 5s under parallel load.
  it('sanitizes raw HTML and dangerous URL attributes before rendering', async () => {
    const { container } = render(MarkdownRenderer, {
      content: '<script>globalThis.__markdownXss = 1</script><img src="x" onerror="globalThis.__markdownXss = 2"><a href="javascript:globalThis.__markdownXss=3">unsafe link</a>',
    });
    await waitForMarkdown(container);

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href')).toBeNull();
    expect((globalThis as Record<string, unknown>).__markdownXss).toBeUndefined();
  }, 15000);

  it('enhances code blocks immediately and keeps copy/highlight behavior', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const { container } = render(MarkdownRenderer, {
      content: '```js\nconst answer = 42;\n```',
    });
    await waitFor(() => {
      expect(container.querySelector('.code-block-wrapper')).not.toBeNull();
    });

    const wrapper = container.querySelector('.code-block-wrapper');
    const code = wrapper?.querySelector('code');
    const copyButton = wrapper?.querySelector<HTMLButtonElement>('.copy-btn');

    expect(wrapper).not.toBeNull();
    expect(code?.classList.contains('hljs')).toBe(true);
    expect(code?.textContent).toContain('const answer = 42;');
    expect(copyButton).not.toBeNull();

    if (!copyButton) throw new Error('Expected an enhanced copy button');
    await fireEvent.click(copyButton);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith('const answer = 42;\n');
  });

  it('renders a malicious fence language as text instead of executable markup', async () => {
    const { container, rerender } = render(MarkdownRenderer, {
      content: '```text\nsafe\n```',
    });

    await rerender({
      content: '```"><img/src=x/onerror=globalThis.__markdownXss=1>\nunsafe\n```',
    });
    await waitForMarkdown(container);

    const header = container.querySelector('.code-block-wrapper > div');
    expect(header).not.toBeNull();
    expect(header?.querySelector('img')).toBeNull();
    expect(header?.querySelector('[onerror]')).toBeNull();
    expect((globalThis as Record<string, unknown>).__markdownXss).toBeUndefined();
  });

  it('binds the delegated copy listener only once across updates', async () => {
    const originalAddEventListener = HTMLElement.prototype.addEventListener;
    let delegatedClickBindings = 0;

    vi.spyOn(HTMLElement.prototype, 'addEventListener').mockImplementation(function (
      this: HTMLElement,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (type === 'click' && this.classList.contains('prose')) {
        delegatedClickBindings += 1;
      }
      originalAddEventListener.call(this, type, listener, options);
    });

    const { container, rerender } = render(MarkdownRenderer, { content: '```text\none\n```' });
    await waitForMarkdown(container);
    await rerender({ content: '```text\ntwo\n```' });
    await rerender({ content: '```text\nthree\n```' });
    await waitForMarkdown(container);

    expect(delegatedClickBindings).toBe(1);
  });
});
