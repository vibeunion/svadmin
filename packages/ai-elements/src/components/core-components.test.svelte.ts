import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Confirmation from './confirmation/Confirmation.svelte';
import PromptInput from './prompt-input/PromptInput.svelte';
import Reasoning from './Reasoning.svelte';
import Response from './Response.svelte';
import Tool from './Tool.svelte';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Response', () => {
  it('escapes raw markup while rendering supported markdown', async () => {
    const { container } = render(Response, {
      content: '<script>globalThis.__aiXss = true</script> **safe** and `code`',
    });

    await waitFor(() => expect(screen.getByText('safe')).not.toBeNull());
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('code')?.textContent).toBe('code');
    expect((globalThis as Record<string, unknown>).__aiXss).toBeUndefined();
  });

  it('copies fenced code and tracks content updates', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const { getByRole, rerender } = render(Response, {
      content: '```ts\nconst answer = 42;\n```',
    });

    await fireEvent.click(getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith('const answer = 42;');

    await rerender({ content: '```ts\nconst answer = 43;\n```' });
    await fireEvent.click(getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenLastCalledWith('const answer = 43;');
    expect(writeText).toHaveBeenCalledTimes(2);
  });
});

describe('PromptInput', () => {
  it('submits trimmed text on Enter', async () => {
    const onsubmit = vi.fn();
    render(PromptInput, { value: '  summarize this  ', onsubmit });

    await fireEvent.keyDown(screen.getByRole('textbox', { name: 'Prompt input' }), { key: 'Enter' });

    expect(onsubmit).toHaveBeenCalledOnce();
    expect(onsubmit.mock.calls[0]?.[0]).toMatchObject({ value: 'summarize this', attachments: [] });
  });

  it('does not submit while composing or when Shift is held', async () => {
    const onsubmit = vi.fn();
    render(PromptInput, { value: '中文输入', onsubmit });
    const input = screen.getByRole('textbox', { name: 'Prompt input' });

    await fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(onsubmit).not.toHaveBeenCalled();
  });

  it('switches to a stop command while loading', async () => {
    const onstop = vi.fn();
    render(PromptInput, { value: 'working', loading: true, onstop });

    await fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

    expect(onstop).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
  });

  it('submits an attachment without text and preserves its File object', async () => {
    const onsubmit = vi.fn();
    const { container } = render(PromptInput, { onsubmit });
    const file = new File(['report'], 'report.txt', { type: 'text/plain' });
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    if (!fileInput) throw new Error('Expected PromptInput to render a file input.');

    await fireEvent.change(fileInput, { target: { files: [file] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onsubmit).toHaveBeenCalledOnce();
    expect(onsubmit.mock.calls[0]?.[0].value).toBe('');
    expect(onsubmit.mock.calls[0]?.[0].attachments[0]).toMatchObject({
      name: 'report.txt',
      mediaType: 'text/plain',
      size: file.size,
      file,
    });
  });
});

describe('structured interaction components', () => {
  it('exposes reasoning and tool state without flattening their content', () => {
    const { container } = render(Reasoning, {
      text: 'Compared the current and expected schemas.',
      streaming: true,
      open: true,
    });

    expect(container.querySelector('details')?.open).toBe(true);
    expect(screen.getByText('Streaming')).not.toBeNull();
    expect(screen.getByText('Compared the current and expected schemas.')).not.toBeNull();

    cleanup();
    render(Tool, {
      name: 'deleteRecords',
      input: { ids: ['1', '2'] },
      state: 'approval-requested',
      open: true,
    });
    expect(screen.getByRole('alert').textContent).toContain('Approval required');
    expect(screen.getByText(/"ids"/)).not.toBeNull();
  });

  it('keeps confirmation actions disabled while an async decision is pending', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const onconfirm = vi.fn(() => pending);
    render(Confirmation, { title: 'Apply changes', onconfirm });
    const confirm = screen.getByRole('button', { name: 'Confirm' });

    await fireEvent.click(confirm);
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(true));
    expect(confirm.textContent).toContain('Working...');

    finish();
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false));
    expect(onconfirm).toHaveBeenCalledOnce();
  });
});
