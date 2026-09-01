import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CodeBlockTestHost from './CodeBlock.test-host.svelte';
import {
  createRawTokens,
  highlightCode,
  type CodeToken,
  type TokenizedCode,
} from './highlight.js';

afterEach(cleanup);

function highlight(code: string, language: string) {
  return new Promise<NonNullable<ReturnType<typeof highlightCode>>>((resolve) => {
    const cached = highlightCode(code, language, resolve);
    if (cached) resolve(cached);
  });
}

describe('code block highlighting', () => {
  it('returns null while Shiki loads, notifies subscribers, and then returns the cached result', async () => {
    const code = '# Async heading 9f62\n**bold** and *italic*';
    const firstSubscriber = vi.fn();
    const secondSubscriber = vi.fn();

    expect(highlightCode(code, 'markdown', firstSubscriber)).toBeNull();
    expect(highlightCode(code, 'markdown', secondSubscriber)).toBeNull();

    await waitFor(() => expect(firstSubscriber).toHaveBeenCalledOnce());
    expect(secondSubscriber).toHaveBeenCalledOnce();

    const result = firstSubscriber.mock.calls[0]?.[0] as TokenizedCode;
    expect(result.tokens.flat().map((token: CodeToken) => token.content).join('')).toBe(code.replace('\n', ''));
    expect(result.tokens.flat().some((token: CodeToken) => token.color && token.darkColor && token.color !== token.darkColor)).toBe(true);
    expect(result.tokens.flat().some((token: CodeToken) => token.fontWeight === 'bold')).toBe(true);
    expect(result.tokens.flat().some((token: CodeToken) => token.fontStyle === 'italic')).toBe(true);

    const cachedSubscriber = vi.fn();
    expect(highlightCode(code, 'markdown', cachedSubscriber)).toBe(result);
    expect(cachedSubscriber).not.toHaveBeenCalled();
  });

  it('preserves empty lines in the immediate raw representation', () => {
    expect(createRawTokens('first\n\nthird').tokens).toEqual([
      [{ content: 'first' }],
      [],
      [{ content: 'third' }],
    ]);
  });

  it('renders highlighted tokens, dual-theme styles, font styles, and line numbers', async () => {
    const view = render(CodeBlockTestHost, {
      code: '# Render heading 2a81\n*styled*',
      language: 'markdown',
      showLineNumbers: true,
    });

    const pre = view.container.querySelector('pre');
    expect(pre?.getAttribute('data-highlighted')).toBe('false');

    await waitFor(() => expect(pre?.getAttribute('data-highlighted')).toBe('true'));
    const styledTokens = [...view.container.querySelectorAll<HTMLElement>('.svadmin-ai-code-token')];
    expect(styledTokens.length).toBeGreaterThan(1);
    expect(styledTokens.some((token) => token.style.getPropertyValue('--shiki-light'))).toBe(true);
    expect(styledTokens.some((token) => token.style.getPropertyValue('--shiki-dark'))).toBe(true);
    expect(styledTokens.some((token) => token.style.getPropertyValue('--shiki-light-font-style') === 'italic')).toBe(true);
    expect(view.container.querySelector('code')?.textContent).toContain('1# Render heading 2a81');
    expect(view.container.querySelector('code')?.textContent).toContain('2*styled*');
  });

  it('discards stale callbacks and re-highlights when code and language change', async () => {
    const view = render(CodeBlockTestHost, {
      code: 'const original_74b0 = true;',
      language: 'typescript',
    });

    await fireEvent.click(view.getByRole('button', { name: 'Update code' }));
    expect(view.container.querySelector('code')?.textContent).toContain('# Updated');

    await waitFor(() => expect(view.container.querySelector('pre')?.getAttribute('data-highlighted')).toBe('true'));
    expect(view.container.querySelector('code')?.textContent).toContain('*italic*');
    expect(view.container.querySelector('code')?.textContent).not.toContain('original_74b0');
  });

  it('highlights unsupported languages as plaintext without losing content', async () => {
    const code = 'custom syntax 1b87';
    const result = await highlight(code, 'not-a-real-language');
    expect(result.tokens.flat().map((token: CodeToken) => token.content).join('')).toBe(code);
  });
});
