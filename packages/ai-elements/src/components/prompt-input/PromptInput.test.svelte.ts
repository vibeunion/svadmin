import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as PromptInputParts from './index.js';
import ProviderHost from './PromptInput.provider.test-host.svelte';

const PromptInput = PromptInputParts.PromptInput;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('Expected PromptInput to render a file input.');
  return input;
}

describe('PromptInput attachments', () => {
  it('exports one canonical root component', () => {
    expect(PromptInputParts.Root).toBe(PromptInputParts.PromptInput);
    expect(PromptInputParts.default).toBe(PromptInputParts.PromptInput);
  });

  it('creates one owned preview and submits the original file without its temporary URL', async () => {
    const onsubmit = vi.fn();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:prompt-input');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const first = new File(['first'], 'first.txt', { type: 'text/plain', lastModified: 1 });
    const second = new File(['second'], 'second.txt', { type: 'text/plain', lastModified: 2 });
    const { container } = render(ProviderHost, { props: { multiple: false, onsubmit } });
    const input = getFileInput(container);

    await fireEvent.change(input, { target: { files: [first, second] } });

    expect(screen.getByText('first.txt')).not.toBeNull();
    expect(screen.queryByText('second.txt')).toBeNull();
    expect(createObjectURL).toHaveBeenCalledOnce();

    await fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onsubmit).toHaveBeenCalledOnce();
    expect(onsubmit.mock.calls[0]?.[0].attachments).toEqual([
      expect.objectContaining({ name: 'first.txt', file: first }),
    ]);
    expect(onsubmit.mock.calls[0]?.[0].attachments[0].url).toBeUndefined();
    await vi.waitFor(() => expect(revokeObjectURL).toHaveBeenCalledOnce());
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:prompt-input');
  });

  it('replaces the existing attachment when multiple is false', async () => {
    const onsubmit = vi.fn();
    const original = new File(['old'], 'old.txt', { type: 'text/plain', lastModified: 1 });
    const replacement = new File(['new'], 'new.txt', { type: 'text/plain', lastModified: 2 });
    const { container } = render(PromptInput, {
      attachments: [{ id: 'old', name: original.name, file: original }],
      multiple: false,
      onsubmit,
    });
    const input = getFileInput(container);

    await fireEvent.change(input, { target: { files: [replacement] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onsubmit).toHaveBeenCalledOnce();
    expect(onsubmit.mock.calls[0]?.[0].attachments).toHaveLength(1);
    expect(onsubmit.mock.calls[0]?.[0].attachments[0]).toMatchObject({
      name: 'new.txt',
      file: replacement,
    });
  });

  it('keeps attachment ids unique while preserving existing ids', async () => {
    const onsubmit = vi.fn();
    const first = new File(['same'], 'duplicate.txt', { type: 'text/plain', lastModified: 10 });
    const second = new File(['same'], 'duplicate.txt', { type: 'text/plain', lastModified: 10 });
    const third = new File(['same'], 'duplicate.txt', { type: 'text/plain', lastModified: 10 });
    const { container } = render(PromptInput, { onsubmit });
    const input = getFileInput(container);

    await fireEvent.change(input, { target: { files: [first, second] } });
    await fireEvent.change(input, { target: { files: [third] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    const ids = onsubmit.mock.calls[0]?.[0].attachments.map((attachment: { id: string }) => attachment.id) ?? [];
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe('duplicate.txt-4-10');
  });

  it('clears the file input before opening the picker again', async () => {
    const { container } = render(PromptInput);
    const input = getFileInput(container);
    const click = vi.spyOn(input, 'click').mockImplementation(() => undefined);
    Object.defineProperty(input, 'value', { configurable: true, writable: true, value: 'stale-selection' });

    await fireEvent.click(screen.getByRole('button', { name: 'Add attachments' }));

    expect(input?.value).toBe('');
    expect(click).toHaveBeenCalledOnce();
  });

  it('tracks externally replaced and cleared attachments with a stable id', async () => {
    const original = new File(['old'], 'old.txt', { type: 'text/plain', lastModified: 1 });
    const replacement = new File(['new'], 'new.txt', { type: 'text/plain', lastModified: 2 });
    const view = render(PromptInput, {
      props: { attachments: [{ id: 'stable', name: original.name, file: original }] },
    });

    expect(screen.getByText('old.txt')).not.toBeNull();
    await view.rerender({ attachments: [{ id: 'stable', name: replacement.name, file: replacement }] });
    expect(screen.queryByText('old.txt')).toBeNull();
    expect(screen.getByText('new.txt')).not.toBeNull();

    await view.rerender({ attachments: [] });
    expect(screen.queryByRole('list', { name: 'Attachments' })).toBeNull();
  });

  it('preserves text and attachments added while an async submit is pending', async () => {
    let resolveSubmit!: () => void;
    const pendingSubmit = new Promise<void>((resolve) => { resolveSubmit = resolve; });
    const onsubmit = vi.fn(() => pendingSubmit);
    const createObjectURL = vi.spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:submitted')
      .mockReturnValueOnce('blob:draft');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const submitted = new File(['submitted'], 'submitted.txt', { type: 'text/plain' });
    const draft = new File(['draft'], 'draft.txt', { type: 'text/plain' });
    const { container } = render(ProviderHost, { props: { multiple: true, onsubmit } });
    const textarea = screen.getByRole('textbox', { name: 'Prompt input' });
    const input = getFileInput(container);

    await fireEvent.input(textarea, { target: { value: 'send this' } });
    await fireEvent.change(input, { target: { files: [submitted] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await fireEvent.input(textarea, { target: { value: 'keep this draft' } });
    await fireEvent.change(input, { target: { files: [draft] } });

    resolveSubmit();

    await waitFor(() => expect(screen.queryByText('submitted.txt')).toBeNull());
    expect((textarea as HTMLTextAreaElement).value).toBe('keep this draft');
    expect(screen.getByText('draft.txt')).not.toBeNull();
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:submitted');
  });

  it('preserves the draft and reports a synchronous submit failure', async () => {
    const onerror = vi.fn();
    const onsubmit = vi.fn(() => { throw new Error('Sync submission failed'); });
    render(PromptInput, { value: 'keep sync draft', onsubmit, onerror });
    const textarea = screen.getByRole('textbox', { name: 'Prompt input' }) as HTMLTextAreaElement;

    await fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(textarea.value).toBe('keep sync draft');
    expect(screen.getByRole('alert').textContent).toBe('Sync submission failed');
    expect(onerror).toHaveBeenCalledWith({ code: 'submit', message: 'Sync submission failed' });
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('preserves text and attachments after an asynchronous submit rejection', async () => {
    const onerror = vi.fn();
    const onsubmit = vi.fn(() => Promise.reject(new Error('Async submission failed')));
    const file = new File(['draft'], 'draft.txt', { type: 'text/plain' });
    const { container } = render(PromptInput, { value: 'keep async draft', onsubmit, onerror });
    await fireEvent.change(getFileInput(container), { target: { files: [file] } });

    await fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Async submission failed'));
    expect((screen.getByRole('textbox', { name: 'Prompt input' }) as HTMLTextAreaElement).value).toBe('keep async draft');
    expect(screen.getByText('draft.txt')).not.toBeNull();
    expect(onerror).toHaveBeenCalledWith({ code: 'submit', message: 'Async submission failed' });
  });

  it('blocks duplicate submissions while the first submission is pending', async () => {
    let resolveSubmit!: () => void;
    const onsubmit = vi.fn(() => new Promise<void>((resolve) => { resolveSubmit = resolve; }));
    render(PromptInput, { value: 'submit once', onsubmit });
    const textarea = screen.getByRole('textbox', { name: 'Prompt input' });

    await fireEvent.keyDown(textarea, { key: 'Enter' });
    await fireEvent.keyDown(textarea, { key: 'Enter' });
    await fireEvent.submit(textarea.closest('form') as HTMLFormElement);

    expect(onsubmit).toHaveBeenCalledOnce();
    resolveSubmit();
    await waitFor(() => expect(
      (screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled,
    ).toBe(true));
  });

  it('accepts case-insensitive filename extensions when MIME metadata is empty', async () => {
    const onsubmit = vi.fn();
    const report = new File(['report'], 'REPORT.PDF', { type: '' });
    const { container } = render(PromptInput, { accept: '.pdf', onsubmit });
    const input = getFileInput(container);

    await fireEvent.change(input, { target: { files: [report] } });
    await fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onsubmit).toHaveBeenCalledOnce();
    expect(onsubmit.mock.calls[0]?.[0].attachments).toEqual([
      expect.objectContaining({ name: 'REPORT.PDF', file: report }),
    ]);
  });
});
