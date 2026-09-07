import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Host from './PromptInput.interaction.test-host.svelte';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function textarea(): HTMLTextAreaElement {
  return screen.getByRole('textbox', { name: 'Prompt input' }) as HTMLTextAreaElement;
}

function submitButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: /^(Send|Submit|Stop)$/ }) as HTMLButtonElement;
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('Expected a file input.');
  return input;
}

function form(): HTMLFormElement {
  const element = textarea().form;
  if (!element) throw new Error('Expected the textarea to belong to a form.');
  return element;
}

function draftFile(name = 'draft.txt'): File {
  return new File(['draft'], name, { type: 'text/plain' });
}

describe('PromptInput global drop ownership', () => {
  it('does not claim file drag or drop events while disabled', async () => {
    const onattachmentadd = vi.fn();
    render(Host, { formProps: { disabled: true, globalDrop: true, onattachmentadd } });

    expect(await fireEvent.dragOver(document, { dataTransfer: { types: ['Files'] } })).toBe(true);
    expect(await fireEvent.drop(document, { dataTransfer: { files: [draftFile()] } })).toBe(true);
    expect(onattachmentadd).not.toHaveBeenCalled();
  });

  it('lets an enabled form receive drops after a disabled globalDrop form mounts first', async () => {
    const firstAdd = vi.fn();
    const secondAdd = vi.fn();
    const first = render(Host, {
      formProps: { disabled: true, globalDrop: true, onattachmentadd: firstAdd },
    });
    const second = render(Host, {
      formProps: { globalDrop: true, onattachmentadd: secondAdd },
    });

    await fireEvent.drop(document, { dataTransfer: { files: [draftFile('second.txt')] } });
    expect(firstAdd).not.toHaveBeenCalled();
    expect(secondAdd).toHaveBeenCalledOnce();
    expect(first.container.textContent).not.toContain('second.txt');
    expect(second.container.textContent).toContain('second.txt');

    await first.rerender({ formProps: { globalDrop: true, onattachmentadd: firstAdd } });
    await second.rerender({ formProps: { disabled: true, globalDrop: true, onattachmentadd: secondAdd } });
    await fireEvent.drop(document, { dataTransfer: { files: [draftFile('first.txt')] } });
    expect(firstAdd).toHaveBeenCalledOnce();
    expect(secondAdd).toHaveBeenCalledOnce();
    expect(first.container.textContent).toContain('first.txt');
    expect(second.container.textContent).not.toContain('first.txt');
  });
});

describe('PromptInput composed form state', () => {
  it('inherits canSubmit for empty, whitespace, text, and attachment-only drafts', async () => {
    const { container } = render(Host);
    expect(submitButton().disabled).toBe(true);
    const requestSubmit = vi.spyOn(form(), 'requestSubmit');
    await fireEvent.keyDown(textarea(), { key: 'Enter' });
    expect(requestSubmit).not.toHaveBeenCalled();
    await fireEvent.input(textarea(), { target: { value: '  ' } });
    expect(submitButton().disabled).toBe(true);
    await fireEvent.input(textarea(), { target: { value: 'message' } });
    expect(submitButton().disabled).toBe(false);
    await fireEvent.input(textarea(), { target: { value: '' } });
    await fireEvent.change(fileInput(container), { target: { files: [draftFile()] } });
    expect(submitButton().disabled).toBe(false);
    await fireEvent.keyDown(textarea(), { key: 'Backspace' });
    expect(submitButton().disabled).toBe(true);
  });

  it.each([
    { status: 'submitted' as const },
    { status: 'streaming' as const },
    { loading: true },
  ])('inherits generating state and stop for %j', async (state) => {
    const onstop = vi.fn();
    const onsubmit = vi.fn();
    const view = render(Host, { formProps: { value: 'message', ...state, onstop, onsubmit } });
    expect(submitButton().type).toBe('button');
    expect(submitButton().getAttribute('aria-label')).toBe('Stop');
    expect(textarea().disabled).toBe(false);
    const requestSubmit = vi.spyOn(form(), 'requestSubmit');
    await fireEvent.keyDown(textarea(), { key: 'Enter' });
    expect(requestSubmit).not.toHaveBeenCalled();
    await fireEvent.click(submitButton());
    expect(onstop).toHaveBeenCalledOnce();
    expect(onsubmit).not.toHaveBeenCalled();
    await view.rerender({ formProps: { value: 'message', status: 'ready', onsubmit } });
    expect(submitButton().type).toBe('submit');
    expect(submitButton().disabled).toBe(false);
  });

  it('inherits disabled state reactively', async () => {
    const view = render(Host, { formProps: { value: 'message', disabled: true } });
    expect(textarea().disabled).toBe(true);
    expect(submitButton().disabled).toBe(true);
    await view.rerender({ formProps: { value: 'message', disabled: false } });
    expect(textarea().disabled).toBe(false);
    expect(submitButton().disabled).toBe(false);
  });

  it('preserves explicit child props and stop callback precedence', async () => {
    const parentStop = vi.fn();
    const childStop = vi.fn();
    const view = render(Host, {
      formProps: { disabled: true, status: 'streaming', onstop: parentStop },
      textareaProps: { disabled: false, value: 'explicit text', name: 'draft' },
      submitProps: { disabled: false, status: 'submitted', onStop: childStop },
    });
    expect(textarea().disabled).toBe(false);
    expect(textarea().value).toBe('explicit text');
    expect(textarea().name).toBe('draft');
    expect(submitButton().disabled).toBe(false);
    expect(submitButton().querySelector('.animate-spin')).not.toBeNull();
    await fireEvent.click(submitButton());
    expect(childStop).toHaveBeenCalledOnce();
    expect(parentStop).not.toHaveBeenCalled();
    await view.rerender({ submitProps: { disabled: true, status: 'ready' } });
    expect(submitButton().type).toBe('button');
    expect(submitButton().disabled).toBe(true);
  });

  it('inherits error status without treating retry as a generating action', () => {
    render(Host, { formProps: { value: 'retry', status: 'error' } });
    expect(submitButton().type).toBe('submit');
    expect(submitButton().disabled).toBe(false);
    expect(submitButton().querySelector('svg')).not.toBeNull();
  });

  it('honors canceled clicks before stopping or submitting', async () => {
    const onstop = vi.fn();
    const onsubmit = vi.fn();
    const onclick = vi.fn((event: MouseEvent) => event.preventDefault());
    const view = render(Host, {
      formProps: { value: 'message', status: 'streaming', onstop, onsubmit },
      submitProps: { onclick },
    });
    await fireEvent.click(submitButton());
    expect(onclick).toHaveBeenCalledOnce();
    expect(onstop).not.toHaveBeenCalled();
    await view.rerender({ formProps: { value: 'message', onsubmit } });
    await fireEvent.click(submitButton());
    expect(onclick).toHaveBeenCalledTimes(2);
    expect(onsubmit).not.toHaveBeenCalled();
  });

  it.each([false, true])('keeps async draft revisions and new files with provider=%s', async (provider) => {
    let resolve!: () => void;
    const onsubmit = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    const onstop = vi.fn();
    const { container } = render(Host, { provider, formProps: { onsubmit, onstop } });
    await fireEvent.input(textarea(), { target: { value: 'original' } });
    await fireEvent.change(fileInput(container), { target: { files: [draftFile('submitted.txt')] } });
    await fireEvent.click(submitButton());
    expect(submitButton().type).toBe('button');
    await fireEvent.keyDown(textarea(), { key: 'Enter' });
    await fireEvent.submit(form());
    await fireEvent.click(submitButton());
    expect(onsubmit).toHaveBeenCalledOnce();
    expect(onstop).toHaveBeenCalledOnce();
    await fireEvent.input(textarea(), { target: { value: 'edited' } });
    await fireEvent.input(textarea(), { target: { value: 'original' } });
    await fireEvent.change(fileInput(container), { target: { files: [draftFile('retained.txt')] } });
    resolve();
    await waitFor(() => expect(submitButton().type).toBe('submit'));
    expect(textarea().value).toBe('original');
    expect(screen.queryByText('submitted.txt')).toBeNull();
    expect(screen.getByText('retained.txt')).not.toBeNull();
  });

  it.each([false, true])('retains failed drafts and files for retry with provider=%s', async (provider) => {
    const onsubmit = vi.fn()
      .mockRejectedValueOnce(new Error('Please retry'))
      .mockResolvedValueOnce(undefined);
    const { container } = render(Host, { provider, formProps: { onsubmit } });
    await fireEvent.input(textarea(), { target: { value: 'retry draft' } });
    await fireEvent.change(fileInput(container), { target: { files: [draftFile()] } });
    await fireEvent.click(submitButton());
    await waitFor(() => expect(submitButton().type).toBe('submit'));
    expect(screen.getByRole('alert').textContent).toBe('Please retry');
    expect(textarea().value).toBe('retry draft');
    expect(screen.getByText('draft.txt')).not.toBeNull();
    await fireEvent.click(submitButton());
    await waitFor(() => expect(textarea().value).toBe(''));
    expect(screen.queryByText('draft.txt')).toBeNull();
    expect(onsubmit).toHaveBeenCalledTimes(2);
  });
});

describe.each(['default', 'composed'] as const)('PromptInput %s safe composition', (mode) => {
  it('keeps Stop available when the streaming form disables editing', async () => {
    const onstop = vi.fn();
    const onsubmit = vi.fn();
    render(Host, { mode, formProps: { value: 'message', disabled: true, loading: true, onstop, onsubmit } });
    expect(textarea().disabled).toBe(true);
    expect(submitButton().disabled).toBe(false);
    expect(submitButton().type).toBe('button');
    await fireEvent.click(submitButton());
    expect(onstop).toHaveBeenCalledOnce();
    expect(onsubmit).not.toHaveBeenCalled();
  });

  it('blocks disabled paste, global drop, picker changes, removal, and Enter', async () => {
    const onsubmit = vi.fn();
    const onattachmentadd = vi.fn();
    const onattachmentremove = vi.fn();
    const { container } = render(Host, {
      mode,
      formProps: {
        disabled: true, globalDrop: true, onsubmit, onattachmentadd, onattachmentremove,
        attachments: [{ id: 'retained', name: 'retained.txt' }],
      },
    });
    const requestSubmit = vi.spyOn(form(), 'requestSubmit');
    await fireEvent.paste(textarea(), { clipboardData: { files: [draftFile()] } });
    await fireEvent.drop(document, { dataTransfer: { files: [draftFile()] } });
    await fireEvent.change(fileInput(container), { target: { files: [draftFile()] } });
    await fireEvent.keyDown(textarea(), { key: 'Backspace' });
    await fireEvent.click(screen.getByRole('button', { name: 'Remove retained.txt' }));
    await fireEvent.keyDown(textarea(), { key: 'Enter' });
    expect(requestSubmit).not.toHaveBeenCalled();
    expect(onattachmentadd).not.toHaveBeenCalled();
    expect(onattachmentremove).not.toHaveBeenCalled();
    expect(onsubmit).not.toHaveBeenCalled();
    expect(screen.getByText('retained.txt')).not.toBeNull();
    expect(screen.queryByText('draft.txt')).toBeNull();
  });

  it('ignores IME Enter, Backspace, and paste until composition ends', async () => {
    const onsubmit = vi.fn();
    render(Host, {
      mode,
      formProps: { onsubmit, attachments: [{ id: 'retained', name: 'retained.txt' }] },
    });
    await fireEvent.compositionStart(textarea());
    await fireEvent.keyDown(textarea(), { key: 'Enter' });
    await fireEvent.keyDown(textarea(), { key: 'Backspace' });
    await fireEvent.paste(textarea(), { clipboardData: { files: [draftFile()] } });
    await fireEvent.compositionEnd(textarea());
    await fireEvent.keyDown(textarea(), { key: 'Enter', isComposing: true });
    await fireEvent.keyDown(textarea(), { key: 'Backspace', isComposing: true });
    await fireEvent.keyDown(textarea(), { key: 'Enter', keyCode: 229 });
    await fireEvent.keyDown(textarea(), { key: 'Backspace', keyCode: 229 });
    await fireEvent.keyDown(textarea(), { key: 'Enter', shiftKey: true });
    expect(onsubmit).not.toHaveBeenCalled();
    expect(screen.getByText('retained.txt')).not.toBeNull();
    expect(screen.queryByText('draft.txt')).toBeNull();
    await fireEvent.keyDown(textarea(), { key: 'Enter' });
    expect(onsubmit).toHaveBeenCalledOnce();
  });

  it('honors canceled global drops and still accepts enabled paste and drop', async () => {
    const ondrop = vi.fn((event: DragEvent) => event.preventDefault());
    const view = render(Host, { mode, formProps: { globalDrop: true, ondrop } });
    await fireEvent.drop(textarea(), { dataTransfer: { files: [draftFile('canceled.txt')] } });
    expect(ondrop).toHaveBeenCalledOnce();
    expect(screen.queryByText('canceled.txt')).toBeNull();
    await fireEvent.paste(textarea(), { clipboardData: { files: [draftFile('pasted.txt')] } });
    expect(screen.getByText('pasted.txt')).not.toBeNull();
    await view.rerender({ formProps: { globalDrop: true } });
    await fireEvent.drop(document, { dataTransfer: { files: [draftFile('dropped.txt')] } });
    expect(screen.getByText('dropped.txt')).not.toBeNull();
  });
});

describe('PromptInput standalone and provider compatibility', () => {
  it.each(['submitted', 'streaming'] as const)('never submits a standalone %s button without a stop handler', async (status) => {
    const onNativeSubmit = vi.fn();
    const onclick = vi.fn();
    render(Host, { mode: 'standalone', submitProps: { status, onclick }, onNativeSubmit });
    expect(submitButton().type).toBe('button');
    await fireEvent.click(submitButton());
    expect(onclick).toHaveBeenCalledOnce();
    expect(onNativeSubmit).not.toHaveBeenCalled();
  });

  it('retains standalone submit, explicit button type, and disabled behavior', async () => {
    const onNativeSubmit = vi.fn();
    const view = render(Host, { mode: 'standalone', onNativeSubmit });
    expect(submitButton().disabled).toBe(false);
    await fireEvent.click(submitButton());
    expect(onNativeSubmit).toHaveBeenCalledOnce();
    await view.rerender({ submitProps: { type: 'button' } });
    await fireEvent.click(submitButton());
    expect(submitButton().type).toBe('button');
    await view.rerender({ submitProps: { disabled: true } });
    await fireEvent.click(submitButton());
    expect(submitButton().disabled).toBe(true);
    expect(onNativeSubmit).toHaveBeenCalledOnce();
  });

  it('preserves provider-only editing and Enter while blocking Enter during explicit generation', async () => {
    const onNativeSubmit = vi.fn();
    const view = render(Host, { mode: 'provider', initialInput: 'provider draft', onNativeSubmit });
    expect(textarea().value).toBe('provider draft');
    await fireEvent.input(textarea(), { target: { value: 'updated' } });
    await fireEvent.keyDown(textarea(), { key: 'Enter' });
    expect(onNativeSubmit).toHaveBeenCalledOnce();
    await view.rerender({ submitProps: { status: 'streaming' } });
    await fireEvent.keyDown(textarea(), { key: 'Enter' });
    await fireEvent.click(submitButton());
    expect(onNativeSubmit).toHaveBeenCalledOnce();
    expect(textarea().value).toBe('updated');
  });

  it('honors explicit textarea disabled and canceled key/paste events in provider-only usage', async () => {
    const onNativeSubmit = vi.fn();
    const onkeydown = vi.fn((event: KeyboardEvent) => event.preventDefault());
    const onpaste = vi.fn((event: ClipboardEvent) => event.preventDefault());
    const view = render(Host, {
      mode: 'provider', onNativeSubmit, textareaProps: { onkeydown, onpaste },
    });
    await fireEvent.paste(textarea(), { clipboardData: { files: [draftFile()] } });
    await fireEvent.keyDown(textarea(), { key: 'Enter' });
    expect(onpaste).toHaveBeenCalledOnce();
    expect(onkeydown).toHaveBeenCalledOnce();
    expect(onNativeSubmit).not.toHaveBeenCalled();
    expect(screen.queryByText('draft.txt')).toBeNull();
    await view.rerender({ textareaProps: {} });
    await fireEvent.paste(textarea(), { clipboardData: { files: [draftFile('retained.txt')] } });
    await view.rerender({ textareaProps: { disabled: true } });
    await fireEvent.paste(textarea(), { clipboardData: { files: [draftFile()] } });
    await fireEvent.keyDown(textarea(), { key: 'Backspace' });
    await fireEvent.keyDown(textarea(), { key: 'Enter' });
    expect(screen.getByText('retained.txt')).not.toBeNull();
    expect(screen.queryByText('draft.txt')).toBeNull();
    expect(onNativeSubmit).not.toHaveBeenCalled();
  });
});
