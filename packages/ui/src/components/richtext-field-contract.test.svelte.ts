import { act, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { Editor as TiptapEditor } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import Editor from '../../../editor/src/components/Editor.svelte';
import LazyEditor from '../../../../example/src/components/LazyRichTextEditor.svelte';
import FieldRenderer from './FieldRenderer.svelte';
import type { FieldDefinition } from '@svadmin/core';
import { useTranslation } from '@svadmin/core';

const { t } = useTranslation();
import { requireValue } from '../../../../scripts/test-assertions';
import { exactRoleName } from '../../test/accessible-name';

vi.mock('../editor-config.svelte.js', () => ({
  getRichTextEditor: () => Editor,
}));
vi.mock('@svadmin/editor/components/Editor.svelte', async () =>
  import('../../../editor/src/components/Editor.svelte'));

const field: FieldDefinition = {
  key: 'body', label: 'Body', type: 'richtext', description: 'Write the details', required: true,
};

async function activeEditor(container: HTMLElement) {
  await waitFor(() => expect(container.querySelector('.tiptap')).not.toBeNull());
  const content = requireValue(container.querySelector<HTMLElement>('.tiptap'));
  const instance: unknown = Reflect.get(content, 'editor');
  if (!(instance instanceof TiptapEditor)) throw new Error('Expected a real Tiptap instance');
  return { content, instance };
}

function dragFile(file: File): DragEvent {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  const event = new DragEvent('drop', { cancelable: true, clientX: 1, clientY: 1 });
  Object.defineProperty(event, 'dataTransfer', { value: transfer });
  return event;
}

function pasteFile(file: File): ClipboardEvent {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  return new ClipboardEvent('paste', { clipboardData: transfer, cancelable: true });
}

async function openImageUpload(container: HTMLElement) {
  await fireEvent.click(within(container).getByRole('button', { name: exactRoleName(t('editor.image')) }));
  await fireEvent.click(within(container).getByRole('button', { name: exactRoleName('Upload') }));
  return requireValue(container.querySelector<HTMLInputElement>('input[type="file"]'));
}

function uploadInEditor(instance: TiptapEditor, method: 'drop' | 'paste', file: File, position = 1) {
  const props = requireValue(instance.options.editorProps);
  if (!props.handleDrop || !props.handlePaste) throw new Error('Expected upload handlers');
  const slice = instance.state.doc.slice(0, 0);
  if (method === 'paste') return props.handlePaste(instance.view, pasteFile(file), slice);
  vi.spyOn(instance.view, 'posAtCoords').mockReturnValue({ pos: position, inside: 0 });
  return props.handleDrop(instance.view, dragFile(file), slice, false);
}

describe('Registered rich text field contract', () => {
  it.each((['drop', 'paste'] as const).flatMap(method =>
    (['sync', 'async'] as const).map(failure => ({ method, failure }))))(
    'recovers from $failure $method upload failures without exposing the cause', async ({ method, failure }) => {
      let calls = 0;
      const upload = vi.fn(() => {
        calls++;
        if (calls === 1) {
          if (failure === 'sync') throw new Error('private provider detail');
          return Promise.reject(new Error('private provider detail'));
        }
        return Promise.resolve('https://example.test/recovered.png');
      });
      const onchange = vi.fn();
      const view = render(Editor, { value: '<p>Text</p>', onUpload: upload, onchange });
      const { instance } = await activeEditor(view.container);
      const file = new File(['image'], 'recovered.png', { type: 'image/png' });
      await act(() => { expect(uploadInEditor(instance, method, file)).toBe(true); });
      const alert = within(view.container).getByRole('alert');
      expect(alert.textContent).toBe(t('common.error'));
      expect(view.container.textContent).not.toContain('private provider detail');
      expect(instance.getHTML()).toBe('<p>Text</p>');
      const retry = within(view.container).getByRole('button', { name: `${t('common.retry')}: recovered.png` });
      await fireEvent.click(retry);
      await fireEvent.click(retry);
      await waitFor(() => expect(instance.getHTML()).toContain('https://example.test/recovered.png'));
      expect(upload).toHaveBeenCalledTimes(2);
      expect(onchange).toHaveBeenCalledTimes(1);
      expect(within(view.container).queryByRole('alert')).toBeNull();
    },
  );

  it.each(['drop', 'paste'] as const)('removes a pending %s task without accepting its late receipt', async method => {
    let resolveUpload: (url: string) => void = () => { throw new Error('Not started'); };
    const upload = vi.fn(() => new Promise<string>(resolve => { resolveUpload = resolve; }));
    const view = render(Editor, { value: '<p>Text</p>', onUpload: upload });
    const { instance } = await activeEditor(view.container);
    const file = new File(['image'], 'pending.png', { type: 'image/png' });
    await act(() => { uploadInEditor(instance, method, file); });
    expect(within(view.container).getByRole('status').textContent).toBe(t('editor.image.uploading'));
    await fireEvent.click(within(view.container).getByRole('button', { name: `${t('common.remove')}: pending.png` }));
    resolveUpload('https://example.test/late.png');
    await act(async () => { await Promise.resolve(); });
    expect(instance.getHTML()).toBe('<p>Text</p>');
    expect(within(view.container).queryByRole('status')).toBeNull();
  });

  it.each((['drop', 'paste'] as const).flatMap(method =>
    (['disabled', 'reenabled', 'readonly', 'reconfigured', 'unmount', 'handler', 'value'] as const)
      .map(change => ({ method, change }))))(
    'ignores late $method failures after $change', async ({ method, change }) => {
      let rejectUpload: (error: Error) => void = () => { throw new Error('Not started'); };
      const upload = vi.fn(() => new Promise<string>((_resolve, reject) => { rejectUpload = reject; }));
      const view = render(Editor, { value: '<p>Text</p>', onUpload: upload });
      const { instance } = await activeEditor(view.container);
      await act(() => { uploadInEditor(instance, method, new File(['image'], 'late.png', { type: 'image/png' })); });
      if (change === 'disabled' || change === 'reenabled') await view.rerender({ disabled: true });
      if (change === 'reenabled') await view.rerender({ disabled: false });
      if (change === 'readonly') await view.rerender({ editable: false });
      if (change === 'reconfigured') await view.rerender({ preset: 'minimal' });
      if (change === 'handler') await view.rerender({ onUpload: async () => 'https://example.test/new.png' });
      if (change === 'value') await view.rerender({ value: '<p>New document</p>' });
      if (change === 'unmount') view.unmount();
      rejectUpload(new Error('obsolete provider detail'));
      await act(async () => { await Promise.resolve(); });
      expect(within(view.container).queryByRole('alert')).toBeNull();
      expect(within(view.container).queryByRole('status')).toBeNull();
      if (change !== 'unmount') {
        expect((await activeEditor(view.container)).instance.getHTML())
          .toBe(change === 'value' ? '<p>New document</p>' : '<p>Text</p>');
      }
    },
  );

  it.each(['drop', 'paste'] as const)('maps a pending %s insertion through document edits', async method => {
    let resolveUpload: (url: string) => void = () => { throw new Error('Not started'); };
    const upload = vi.fn(() => new Promise<string>(resolve => { resolveUpload = resolve; }));
    const view = render(Editor, { value: '<p>AB</p>', onUpload: upload });
    const { instance } = await activeEditor(view.container);
    await act(() => { instance.commands.setTextSelection(2); });
    await act(() => { uploadInEditor(instance, method, new File(['image'], 'mapped.png', { type: 'image/png' }), 2); });
    await act(() => {
      instance.commands.insertContentAt(1, 'X');
      instance.commands.setTextSelection(1);
    });
    resolveUpload('https://example.test/mapped.png');
    await act(async () => { await Promise.resolve(); });
    const content = requireValue(view.container.querySelector('.tiptap'));
    expect(content.firstElementChild?.textContent).toBe('XA');
    expect(content.querySelector('img')?.getAttribute('src')).toBe('https://example.test/mapped.png');
    expect(content.lastElementChild?.textContent).toBe('B');
  });

  it('replaces the original paste selection even when the caret moves before completion', async () => {
    let resolveUpload: (url: string) => void = () => { throw new Error('Not started'); };
    const view = render(Editor, {
      value: '<p>ABCD</p>',
      onUpload: () => new Promise<string>(resolve => { resolveUpload = resolve; }),
    });
    const { instance } = await activeEditor(view.container);
    await act(() => { instance.commands.setTextSelection({ from: 2, to: 4 }); });
    await act(() => { uploadInEditor(instance, 'paste', new File(['image'], 'selected.png', { type: 'image/png' })); });
    await act(() => { instance.commands.setTextSelection(1); });
    resolveUpload('https://example.test/selected.png');
    await act(async () => { await Promise.resolve(); });
    const content = requireValue(view.container.querySelector('.tiptap'));
    expect(content.firstElementChild?.textContent).toBe('A');
    expect(content.lastElementChild?.textContent).toBe('D');
    expect(content.querySelector('img')?.getAttribute('src')).toBe('https://example.test/selected.png');
  });

  it('preserves text added inside a pending paste replacement range', async () => {
    let resolveUpload: (url: string) => void = () => { throw new Error('Not started'); };
    const view = render(Editor, {
      value: '<p>ABCD</p>',
      onUpload: () => new Promise<string>(resolve => { resolveUpload = resolve; }),
    });
    const { instance } = await activeEditor(view.container);
    await act(() => { instance.commands.setTextSelection({ from: 2, to: 4 }); });
    await act(() => { uploadInEditor(instance, 'paste', new File(['image'], 'selected.png', { type: 'image/png' })); });
    await act(() => { instance.commands.insertContentAt(3, 'NEW'); });
    resolveUpload('https://example.test/selected.png');
    await act(async () => { await Promise.resolve(); });
    expect(instance.state.doc.textContent).toBe('ABNEWCD');
    expect(view.container.querySelector('.tiptap img')?.getAttribute('src')).toBe('https://example.test/selected.png');
  });

  it('maps upload anchors through appended document transactions', async () => {
    let resolveUpload: (url: string) => void = () => { throw new Error('Not started'); };
    const view = render(Editor, {
      value: '<p>AB</p>',
      onUpload: () => new Promise<string>(resolve => { resolveUpload = resolve; }),
    });
    const { instance } = await activeEditor(view.container);
    await act(() => { uploadInEditor(instance, 'drop', new File(['image'], 'appended.png', { type: 'image/png' }), 2); });
    instance.registerPlugin(new Plugin({
      appendTransaction: (transactions, _oldState, newState) => {
        if (!transactions.some(transaction => transaction.getMeta('append-upload-test'))) return null;
        return newState.tr.insertText('X', 1);
      },
    }));
    await act(() => {
      instance.view.dispatch(instance.state.tr.setMeta('append-upload-test', true));
    });
    resolveUpload('https://example.test/appended.png');
    await act(async () => { await Promise.resolve(); });
    expect(instance.state.doc.textContent).toBe('XAB');
    expect(view.container.querySelector('.tiptap')?.firstElementChild?.textContent).toBe('XA');
    expect(view.container.querySelector('.tiptap')?.lastElementChild?.textContent).toBe('B');
    expect(view.container.querySelector('.tiptap img')?.getAttribute('src')).toBe('https://example.test/appended.png');
  });

  it('keeps distinct drop anchors when their receipts arrive in reverse order', async () => {
    const resolvers = new Map<string, (url: string) => void>();
    const view = render(Editor, {
      value: '<p>ABCD</p>',
      onUpload: (file: File) => new Promise<string>(resolve => { resolvers.set(file.name, resolve); }),
    });
    const { instance } = await activeEditor(view.container);
    await act(() => {
      uploadInEditor(instance, 'drop', new File(['image'], 'first.png', { type: 'image/png' }), 2);
      uploadInEditor(instance, 'drop', new File(['image'], 'second.png', { type: 'image/png' }), 4);
    });
    requireValue(resolvers.get('second.png'))('https://example.test/second.png');
    await act(async () => { await Promise.resolve(); });
    requireValue(resolvers.get('first.png'))('https://example.test/first.png');
    await act(async () => { await Promise.resolve(); });
    const content = requireValue(view.container.querySelector('.tiptap'));
    expect(Array.from(content.children, node => node.getAttribute('src') ?? node.textContent)).toEqual([
      'A', 'https://example.test/first.png', 'BC', 'https://example.test/second.png', 'D',
    ]);
  });

  it.each(['drop', 'paste'] as const)('retries only the failed task in a multi-image %s', async method => {
    let firstFailed = false;
    const upload = vi.fn(async (file: File) => {
      if (file.name === 'first.png' && !firstFailed) {
        firstFailed = true;
        throw new Error('first failed');
      }
      return `https://example.test/${file.name}`;
    });
    const view = render(Editor, { value: '<p>Text</p>', onUpload: upload });
    const { instance } = await activeEditor(view.container);
    const transfer = new DataTransfer();
    for (const name of ['first.png', 'second.png']) transfer.items.add(new File(['image'], name, { type: 'image/png' }));
    const props = requireValue(instance.options.editorProps);
    const slice = instance.state.doc.slice(0, 0);
    await act(() => {
      if (method === 'drop') {
        vi.spyOn(instance.view, 'posAtCoords').mockReturnValue({ pos: 1, inside: 0 });
        const event = new DragEvent('drop', { cancelable: true });
        Object.defineProperty(event, 'dataTransfer', { value: transfer });
        expect(props.handleDrop?.(instance.view, event, slice, false)).toBe(true);
      } else {
        expect(props.handlePaste?.(instance.view, new ClipboardEvent('paste', { clipboardData: transfer, cancelable: true }), slice)).toBe(true);
      }
    });
    expect(instance.getHTML()).toContain('https://example.test/second.png');
    await fireEvent.click(within(view.container).getByRole('button', { name: `${t('common.retry')}: first.png` }));
    await waitFor(() => expect(view.container.querySelectorAll('.tiptap img')).toHaveLength(2));
    expect(upload.mock.calls.map(([file]) => file.name)).toEqual(['first.png', 'second.png', 'first.png']);
    expect(within(view.container).queryByRole('alert')).toBeNull();
  });

  it.each(['drop', 'paste'] as const)('discards a successful %s receipt after external content replacement', async method => {
    let resolveUpload: (url: string) => void = () => { throw new Error('Not started'); };
    const onchange = vi.fn();
    const view = render(Editor, {
      value: '<p>Old document</p>', onchange,
      onUpload: () => new Promise<string>(resolve => { resolveUpload = resolve; }),
    });
    const { instance } = await activeEditor(view.container);
    await act(() => { uploadInEditor(instance, method, new File(['image'], 'old.png', { type: 'image/png' })); });
    await view.rerender({ value: '<p>New document</p>' });
    resolveUpload('https://example.test/old.png');
    await act(async () => { await Promise.resolve(); });
    expect(instance.getHTML()).toBe('<p>New document</p>');
    expect(onchange).not.toHaveBeenCalled();
    expect(within(view.container).queryByRole('status')).toBeNull();
  });

  it('clears a pending upload when the host replaces content after a local edit', async () => {
    let resolveUpload: (url: string) => void = () => { throw new Error('Not started'); };
    const onchange = vi.fn();
    const view = render(Editor, {
      value: '<p>Old document</p>', onchange,
      onUpload: () => new Promise<string>(resolve => { resolveUpload = resolve; }),
    });
    const { instance } = await activeEditor(view.container);
    await act(async () => {
      uploadInEditor(instance, 'paste', new File(['image'], 'old.png', { type: 'image/png' }));
      instance.commands.insertContentAt(2, 'local');
      await view.rerender({ value: '<p>Host document</p>' });
    });
    expect(onchange).toHaveBeenCalled();
    resolveUpload('https://example.test/old.png');
    await act(async () => { await Promise.resolve(); });
    expect(instance.getHTML()).toBe('<p>Host document</p>');
    expect(within(view.container).queryByRole('status')).toBeNull();
  });

  it.each(['disabled', 'reenabled', 'readonly', 'reconfigured', 'unmount', 'handler', 'closed', 'reopened'] as const)(
    'ignores late toolbar uploads after %s', async change => {
      let resolveUpload: (url: string) => void = () => { throw new Error('Upload not started'); };
      const upload = vi.fn(() => new Promise<string>(resolve => { resolveUpload = resolve; }));
      const onchange = vi.fn();
      const view = render(Editor, { value: '<p>Text</p>', onUpload: upload, onchange });
      const { instance } = await activeEditor(view.container);
      const input = await openImageUpload(view.container);
      const file = new File(['image'], 'late.png', { type: 'image/png' });
      await fireEvent.change(input, { target: { files: [file] } });
      expect(upload).toHaveBeenCalledExactlyOnceWith(file);
      if (change === 'disabled' || change === 'reenabled') await view.rerender({ disabled: true });
      if (change === 'reenabled') await view.rerender({ disabled: false });
      if (change === 'readonly') await view.rerender({ editable: false });
      if (change === 'reconfigured') await view.rerender({ preset: 'minimal' });
      if (change === 'unmount') view.unmount();
      if (change === 'handler') await view.rerender({ onUpload: async () => 'https://example.test/new.png' });
      if (change === 'closed' || change === 'reopened') {
        await fireEvent.click(within(view.container).getByRole('button', { name: exactRoleName(t('editor.image')) }));
        if (change === 'reopened') await openImageUpload(view.container);
      }
      resolveUpload('https://example.test/late.png');
      await act(async () => { await Promise.resolve(); });
      if (change === 'unmount') expect(instance.isDestroyed).toBe(true);
      else expect((await activeEditor(view.container)).instance.getHTML()).toBe('<p>Text</p>');
      if (change === 'reopened') expect(view.container.querySelector('input[type="file"]')).not.toBeNull();
      expect(onchange).not.toHaveBeenCalled();
    },
  );

  it('prevents concurrent toolbar uploads and inserts a successful receipt once', async () => {
    let resolveUpload: (url: string) => void = () => { throw new Error('Upload not started'); };
    const upload = vi.fn(() => new Promise<string>(resolve => { resolveUpload = resolve; }));
    const onchange = vi.fn();
    const view = render(Editor, { value: '<p>Text</p>', onUpload: upload, onchange });
    const { instance } = await activeEditor(view.container);
    const input = await openImageUpload(view.container);
    const file = new File(['image'], 'current.png', { type: 'image/png' });
    await fireEvent.change(input, { target: { files: [file] } });
    expect(input.disabled).toBe(true);
    for (const name of ['URL', 'Upload']) {
      expect(within(view.container).getByRole('button', { name: exactRoleName(name) }).hasAttribute('disabled')).toBe(true);
    }
    const zone = within(view.container).getByRole('button', { name: t('editor.image.upload') });
    expect(zone.getAttribute('aria-busy')).toBe('true');
    await fireEvent(zone, dragFile(file));
    expect(upload).toHaveBeenCalledTimes(1);
    resolveUpload('https://example.test/current.png');
    await act(async () => { await Promise.resolve(); });
    expect(instance.getHTML()).toContain('https://example.test/current.png');
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('input[type="file"]')).toBeNull();
  });

  it('does not start queued uploads after the toolbar popover is dismissed', async () => {
    let resolveUpload: (url: string) => void = () => { throw new Error('Upload not started'); };
    const upload = vi.fn(() => new Promise<string>(resolve => { resolveUpload = resolve; }));
    const view = render(Editor, { value: '<p>Text</p>', onUpload: upload });
    const { instance } = await activeEditor(view.container);
    const input = await openImageUpload(view.container);
    const files = ['first.png', 'second.png', 'third.png'].map(name => new File(['image'], name, { type: 'image/png' }));
    await fireEvent.change(input, { target: { files } });
    await fireEvent.keyDown(within(view.container).getByRole('button', { name: t('editor.image.upload') }), { key: 'Escape' });
    resolveUpload('https://example.test/late.png');
    await act(async () => { await Promise.resolve(); });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(instance.getHTML()).toBe('<p>Text</p>');
  });

  it('keeps the replacement upload busy when an obsolete request settles', async () => {
    let resolveOld: (url: string) => void = () => { throw new Error('Upload not started'); };
    let resolveNew: (url: string) => void = () => { throw new Error('Upload not started'); };
    const oldUpload = vi.fn(() => new Promise<string>(resolve => { resolveOld = resolve; }));
    const newUpload = vi.fn(() => new Promise<string>(resolve => { resolveNew = resolve; }));
    const view = render(Editor, { value: '<p>Text</p>', onUpload: oldUpload });
    const { instance } = await activeEditor(view.container);
    const input = await openImageUpload(view.container);
    const file = new File(['image'], 'current.png', { type: 'image/png' });
    await fireEvent.change(input, { target: { files: [file] } });
    await view.rerender({ onUpload: newUpload });
    expect(input.disabled).toBe(false);
    await fireEvent.change(input, { target: { files: [file] } });
    resolveOld('https://example.test/old.png');
    await act(async () => { await Promise.resolve(); });
    expect(input.isConnected).toBe(true);
    expect(input.disabled).toBe(true);
    expect(instance.getHTML()).toBe('<p>Text</p>');
    resolveNew('https://example.test/new.png');
    await act(async () => { await Promise.resolve(); });
    expect(instance.getHTML()).toContain('https://example.test/new.png');
    expect(instance.getHTML()).not.toContain('https://example.test/old.png');
    expect(input.isConnected).toBe(false);
  });

  it('keeps failed toolbar uploads recoverable without duplicating completed files', async () => {
    let attempts = 0;
    const upload = vi.fn(async (file: File) => {
      attempts++;
      if (attempts === 2) throw new Error('temporary failure');
      return `https://example.test/${file.name}`;
    });
    const onchange = vi.fn();
    const view = render(Editor, { value: '<p>Text</p>', onUpload: upload, onchange });
    const { instance } = await activeEditor(view.container);
    const input = await openImageUpload(view.container);
    const files = ['first.png', 'second.png', 'third.png'].map(name => new File(['image'], name, { type: 'image/png' }));
    await fireEvent.change(input, { target: { files } });
    await waitFor(() => expect(within(view.container).getByRole('alert').textContent).toContain(t('common.error')));
    expect(instance.getHTML()).toContain('https://example.test/first.png');
    expect(instance.getHTML()).not.toContain('second.png');
    expect(view.container.querySelector('input[type="file"]')).not.toBeNull();
    await fireEvent.click(within(view.container).getByRole('button', { name: exactRoleName(t('common.retry')) }));
    await waitFor(() => expect(view.container.querySelector('input[type="file"]')).toBeNull());
    expect(instance.getHTML()).toContain('https://example.test/second.png');
    expect(instance.getHTML()).toContain('https://example.test/third.png');
    expect(upload).toHaveBeenCalledTimes(4);
    expect(upload.mock.calls.map(([file]) => file.name)).toEqual(['first.png', 'second.png', 'second.png', 'third.png']);
    expect(view.container.querySelector('input[type="file"]')).toBeNull();
    expect(onchange).toHaveBeenCalledTimes(3);
  });

  it('shows a generic error for a synchronous toolbar upload failure and allows retrying the same file', async () => {
    let shouldFail = true;
    const upload = vi.fn((file: File) => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error('private backend detail');
      }
      return Promise.resolve(`https://example.test/${file.name}`);
    });
    const view = render(Editor, { value: '<p>Text</p>', onUpload: upload });
    const { instance } = await activeEditor(view.container);
    const input = await openImageUpload(view.container);
    const file = new File(['image'], 'retry.png', { type: 'image/png' });
    await fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(within(view.container).getByRole('alert').textContent).toContain(t('common.error')));
    expect(within(view.container).queryByText('private backend detail')).toBeNull();
    await fireEvent.click(within(view.container).getByRole('button', { name: exactRoleName(t('common.retry')) }));
    await waitFor(() => expect(instance.getHTML()).toContain('https://example.test/retry.png'));
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('clears the failed queue when the upload handler changes', async () => {
    const oldUpload = vi.fn(async () => { throw new Error('old failure'); });
    const newUpload = vi.fn(async () => 'https://example.test/new.png');
    const view = render(Editor, { value: '<p>Text</p>', onUpload: oldUpload });
    const { instance } = await activeEditor(view.container);
    const input = await openImageUpload(view.container);
    const file = new File(['image'], 'new.png', { type: 'image/png' });
    await fireEvent.change(input, { target: { files: [file] } });
    expect(within(view.container).getByRole('alert').textContent).toContain(t('common.error'));
    await view.rerender({ onUpload: newUpload });
    expect(within(view.container).queryByRole('alert')).toBeNull();
    expect(within(view.container).queryByRole('button', { name: t('common.retry') })).toBeNull();
    expect(newUpload).not.toHaveBeenCalled();
    await fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(instance.getHTML()).toContain('https://example.test/new.png'));
    expect(newUpload).toHaveBeenCalledExactlyOnceWith(file);
  });

  it('ignores an obsolete failure while the replacement request is pending', async () => {
    let rejectOld: (error: Error) => void = () => { throw new Error('Old upload not started'); };
    let resolveNew: (url: string) => void = () => { throw new Error('New upload not started'); };
    const oldUpload = vi.fn(() => new Promise<string>((_resolve, reject) => { rejectOld = reject; }));
    const newUpload = vi.fn(() => new Promise<string>(resolve => { resolveNew = resolve; }));
    const view = render(Editor, { value: '<p>Text</p>', onUpload: oldUpload });
    const { instance } = await activeEditor(view.container);
    const input = await openImageUpload(view.container);
    const file = new File(['image'], 'replacement.png', { type: 'image/png' });
    await fireEvent.change(input, { target: { files: [file] } });
    await view.rerender({ onUpload: newUpload });
    await fireEvent.change(input, { target: { files: [file] } });
    rejectOld(new Error('obsolete failure'));
    await act(async () => { await Promise.resolve(); });
    expect(within(view.container).queryByRole('alert')).toBeNull();
    expect(input.disabled).toBe(true);
    resolveNew('https://example.test/replacement.png');
    await waitFor(() => expect(instance.getHTML()).toContain('https://example.test/replacement.png'));
  });

  it('allows selecting the same file again after a failed toolbar upload', async () => {
    let shouldFail = true;
    const upload = vi.fn(async (file: File) => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error('temporary failure');
      }
      return `https://example.test/${file.name}`;
    });
    const view = render(Editor, { value: '<p>Text</p>', onUpload: upload });
    const { instance } = await activeEditor(view.container);
    const input = await openImageUpload(view.container);
    const file = new File(['image'], 'same.png', { type: 'image/png' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    await fireEvent.change(input);
    await waitFor(() => expect(within(view.container).getByRole('alert')).not.toBeNull());
    expect(input.files).toHaveLength(0);
    input.files = transfer.files;
    await fireEvent.change(input);
    await waitFor(() => expect(instance.getHTML()).toContain('https://example.test/same.png'));
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it.each(['handler', 'reopened', 'disabled', 'unmount'] as const)(
    'ignores late toolbar failures after %s', async change => {
      let rejectUpload: (error: Error) => void = () => { throw new Error('Upload not started'); };
      const upload = vi.fn(() => new Promise<string>((_resolve, reject) => { rejectUpload = reject; }));
      const view = render(Editor, { value: '<p>Text</p>', onUpload: upload });
      await activeEditor(view.container);
      const input = await openImageUpload(view.container);
      await fireEvent.change(input, { target: { files: [new File(['image'], 'late.png', { type: 'image/png' })] } });
      if (change === 'handler') await view.rerender({ onUpload: async () => 'https://example.test/new.png' });
      if (change === 'disabled') await view.rerender({ disabled: true });
      if (change === 'unmount') view.unmount();
      if (change === 'reopened') {
        await fireEvent.click(within(view.container).getByRole('button', { name: exactRoleName(t('editor.image')) }));
        await openImageUpload(view.container);
      }
      rejectUpload(new Error('obsolete failure'));
      await act(async () => { await Promise.resolve(); });
      expect(within(view.container).queryByRole('alert')).toBeNull();
      expect(within(view.container).queryByRole('button', { name: t('common.retry') })).toBeNull();
    },
  );

  it('prevents duplicate requests while retry is pending and can fail again', async () => {
    let rejectRetry: (error: Error) => void = () => { throw new Error('Retry not started'); };
    let calls = 0;
    const upload = vi.fn(() => {
      calls++;
      if (calls === 1) return Promise.reject(new Error('first failure'));
      return new Promise<string>((_resolve, reject) => { rejectRetry = reject; });
    });
    const view = render(Editor, { value: '<p>Text</p>', onUpload: upload });
    const { instance } = await activeEditor(view.container);
    const input = await openImageUpload(view.container);
    const file = new File(['image'], 'retry.png', { type: 'image/png' });
    await fireEvent.change(input, { target: { files: [file] } });
    const retry = within(view.container).getByRole('button', { name: exactRoleName(t('common.retry')) });
    await fireEvent.click(retry);
    await fireEvent.click(retry);
    await fireEvent.change(input, { target: { files: [file] } });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(input.disabled).toBe(true);
    rejectRetry(new Error('second failure'));
    await act(async () => { await Promise.resolve(); });
    expect(input.disabled).toBe(false);
    expect(within(view.container).getByRole('alert').textContent).toContain(t('common.error'));
    expect(instance.getHTML()).toBe('<p>Text</p>');
  });

  it('names and describes the actual editing area without crossing field instances', async () => {
    const ids: string[] = [];
    for (let index = 0; index < 2; index += 1) {
      const view = render(FieldRenderer, {
        field, value: '<p>Details</p>', onchange: vi.fn(), invalid: true, errorId: `error-${index}`,
      });
      const { content } = await activeEditor(view.container);
      expect(within(view.container).getByRole('textbox', { name: 'Body *' })).toBe(content);
      const label = requireValue(view.container.querySelector('label'));
      const description = requireValue(view.container.querySelector('[data-svadmin-field-description]'));
      expect(content.getAttribute('aria-labelledby')).toBe(label.id);
      expect(label.hasAttribute('for')).toBe(false);
      expect(content.getAttribute('aria-describedby')).toBe(`${description.id} error-${index}`);
      expect(content.getAttribute('aria-invalid')).toBe('true');
      expect(content.getAttribute('aria-required')).toBe('true');
      expect(content.getAttribute('aria-multiline')).toBe('true');
      expect(document.getElementById(content.id)).toBe(content);
      ids.push(content.id);
    }
    expect(new Set(ids).size).toBe(2);
  });

  it('resolves each rich text editing area to its own description and host error without crossing instances', async () => {
    const onchange = vi.fn();
    const fieldA: FieldDefinition = {
      key: 'bodyA', label: 'Body A', type: 'richtext', description: 'First help', required: true,
    };
    const fieldB: FieldDefinition = {
      key: 'bodyB', label: 'Body B', type: 'richtext', description: 'Second help', required: true,
    };
    const errorIdA = 'host-body-error-a';
    const errorIdB = 'host-body-error-b';
    const hostErrors: HTMLElement[] = [];
    const attachHostError = (id: string, text: string): HTMLElement => {
      const error = document.createElement('p');
      error.id = id;
      error.textContent = text;
      document.body.append(error);
      hostErrors.push(error);
      return error;
    };

    try {
      const errorA = attachHostError(errorIdA, 'Error A');
      const errorB = attachHostError(errorIdB, 'Error B');
      const viewA = render(FieldRenderer, {
        field: fieldA, value: '<p>Details A</p>', onchange, invalid: true, errorId: errorIdA,
      });
      const viewB = render(FieldRenderer, {
        field: fieldB, value: '<p>Details B</p>', onchange, invalid: true, errorId: errorIdB,
      });
      const editorA = await activeEditor(viewA.container);
      const editorB = await activeEditor(viewB.container);
      const descriptionA = requireValue(
        viewA.container.querySelector<HTMLElement>('[data-svadmin-field-description]'),
      );
      const descriptionB = requireValue(
        viewB.container.querySelector<HTMLElement>('[data-svadmin-field-description]'),
      );
      expect(descriptionA.id).not.toBe(descriptionB.id);

      const instances = [
        { view: viewA, content: editorA.content, description: descriptionA, descriptionText: 'First help',
          error: errorA, errorId: errorIdA, otherDescriptionId: descriptionB.id, otherErrorId: errorIdB },
        { view: viewB, content: editorB.content, description: descriptionB, descriptionText: 'Second help',
          error: errorB, errorId: errorIdB, otherDescriptionId: descriptionA.id, otherErrorId: errorIdA },
      ] as const;

      for (const instance of instances) {
        const { view, content, description, error, errorId } = instance;
        expect(content.getAttribute('contenteditable')).toBe('true');
        const refs = requireValue(content.getAttribute('aria-describedby')).split(/\s+/);
        expect(refs).toEqual([description.id, errorId]);
        expect(refs).not.toContain(instance.otherDescriptionId);
        expect(refs).not.toContain(instance.otherErrorId);
        expect(document.getElementById(description.id)).toBe(description);
        expect(document.getElementById(errorId)).toBe(error);
        expect(document.getElementById(errorId)?.parentElement).toBe(document.body);
        expect(description.textContent).toBe(instance.descriptionText);
        expect(error.textContent).toBe(errorId === errorIdA ? 'Error A' : 'Error B');
        expect(description.isConnected).toBe(true);
        expect(error.isConnected).toBe(true);
        expect(view.container.contains(description)).toBe(true);
        expect(content.getAttribute('aria-invalid')).toBe('true');
        expect(content.getAttribute('aria-required')).toBe('true');
        expect(content.getAttribute('aria-multiline')).toBe('true');
      }

      const contentB = editorB.content;
      const describedByB = requireValue(contentB.getAttribute('aria-describedby'));

      await viewA.rerender({
        field: { ...fieldA, description: '' }, value: '<p>Details A</p>',
        invalid: false, errorId: undefined,
      });

      expect(viewA.container.querySelector('[data-svadmin-field-description]')).toBeNull();
      expect(editorA.content.hasAttribute('aria-describedby')).toBe(false);
      expect(editorA.content.hasAttribute('aria-invalid')).toBe(false);
      expect(document.getElementById(errorIdA)).toBe(errorA);
      expect(errorA.isConnected).toBe(true);

      expect(editorB.content).toBe(contentB);
      expect(editorB.content.getAttribute('aria-describedby')).toBe(describedByB);
      expect(editorB.content.getAttribute('aria-invalid')).toBe('true');
      expect(editorB.content.getAttribute('aria-required')).toBe('true');
      expect(editorB.content.getAttribute('aria-multiline')).toBe('true');
      const currentDescriptionB = requireValue(
        viewB.container.querySelector<HTMLElement>('[data-svadmin-field-description]'),
      );
      expect(currentDescriptionB).toBe(descriptionB);
      expect(currentDescriptionB.id).toBe(descriptionB.id);
      expect(currentDescriptionB.textContent).toBe('Second help');
      expect(currentDescriptionB.isConnected).toBe(true);
      expect(document.getElementById(errorIdB)).toBe(errorB);
      expect(errorB.id).toBe(errorIdB);
      expect(errorB.textContent).toBe('Error B');
      expect(errorB.isConnected).toBe(true);
      expect(viewA.container.querySelector(`#${errorIdB}`)).toBeNull();
      expect(viewB.container.querySelector(`#${errorIdA}`)).toBeNull();
      expect(onchange).not.toHaveBeenCalled();
    } finally {
      for (const error of hostErrors) error.remove();
    }
  });

  it('updates and removes feedback without recreating the editor or losing content and selection', async () => {
    const onchange = vi.fn();
    const view = render(FieldRenderer, {
      field, value: '<p>Details</p>', onchange, invalid: true, errorId: 'body-error',
    });
    const { content, instance } = await activeEditor(view.container);
    content.focus();
    await act(() => { instance.commands.setTextSelection({ from: 1, to: 4 }); });
    const selection = instance.state.selection.toJSON();
    await view.rerender({ field: { ...field, description: 'Updated help' }, invalid: false, errorId: '' });
    expect(view.container.querySelector('.tiptap')).toBe(content);
    expect(instance.isDestroyed).toBe(false);
    expect(instance.state.selection.toJSON()).toEqual(selection);
    expect(instance.getHTML()).toBe('<p>Details</p>');
    expect(document.activeElement).toBe(content);
    expect(content.hasAttribute('aria-invalid')).toBe(false);
    const description = requireValue(view.container.querySelector('[data-svadmin-field-description]'));
    expect(content.getAttribute('aria-describedby')).toBe(description.id);
    expect(description.textContent).toBe('Updated help');
    await view.rerender({ field: { ...field, description: '', required: false } });
    expect(content.hasAttribute('aria-describedby')).toBe(false);
    expect(content.hasAttribute('aria-required')).toBe(false);
    expect(instance.state.selection.toJSON()).toEqual(selection);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('omits disabled HTML from native submission and restores the latest controlled value', async () => {
    const form = document.createElement('form');
    document.body.append(form);
    const onchange = vi.fn();
    const view = render(FieldRenderer, { target: form, props: {
      field, value: '<p>Initial</p>', disabled: true, onchange,
    } });
    try {
      const { content, instance } = await activeEditor(form);
      expect(content.getAttribute('contenteditable')).toBe('false');
      expect(content.getAttribute('aria-disabled')).toBe('true');
      expect(content.getAttribute('aria-readonly')).toBe('true');
      expect(content.getAttribute('tabindex')).toBe('-1');
      expect(within(form).queryByRole('button', { name: /Bold/i })).toBeNull();
      expect(Array.from(new FormData(form))).toEqual([]);
      await view.rerender({ value: '<p>Latest</p>' });
      expect(instance.getHTML()).toBe('<p>Latest</p>');
      await view.rerender({ disabled: false });
      expect(form.querySelector('.tiptap')).toBe(content);
      expect(instance.isEditable).toBe(true);
      expect(content.hasAttribute('aria-disabled')).toBe(false);
      expect(content.getAttribute('aria-readonly')).toBe('false');
      expect(content.getAttribute('tabindex')).toBe('0');
      expect(Array.from(new FormData(form))).toEqual([['body', '<p>Latest</p>']]);
      expect(onchange).not.toHaveBeenCalled();
    } finally {
      view.unmount();
      form.remove();
    }
  });

  it('preserves direct editable=false while disabled is toggled', async () => {
    const onchange = vi.fn();
    const view = render(Editor, {
      value: '<p>Read only</p>', editable: false, disabled: true, preset: 'minimal',
      'aria-label': 'Direct editor', onchange,
    });
    const { content, instance } = await activeEditor(view.container);
    expect(within(view.container).getByRole('textbox', { name: 'Direct editor' })).toBe(content);
    await view.rerender({ disabled: false, value: '<p>Host update</p>' });
    expect(instance.isEditable).toBe(false);
    expect(content.getAttribute('contenteditable')).toBe('false');
    expect(instance.getHTML()).toBe('<p>Host update</p>');
    expect(within(view.container).queryByRole('button')).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });

  it('keeps a real editing transaction and its callback intact', async () => {
    const onchange = vi.fn();
    const view = render(Editor, { value: '<p>Text</p>', preset: 'minimal', onchange });
    const { content, instance } = await activeEditor(view.container);
    await act(() => { instance.commands.insertContentAt(5, '!'); });
    expect(instance.getHTML()).toBe('<p>Text!</p>');
    expect(onchange).toHaveBeenCalledExactlyOnceWith('<p>Text!</p>');
    expect(view.container.querySelector('.tiptap')).toBe(content);
    expect(instance.isDestroyed).toBe(false);
  });

  it.each((['drop', 'paste'] as const).flatMap(method =>
    (['disabled', 'reenabled', 'readonly', 'reconfigured', 'unmount', 'handler'] as const)
      .map(change => ({ method, change }))))('ignores late $method uploads after $change', async ({ method, change }) => {
    let resolveUpload: (url: string) => void = () => { throw new Error('Upload not started'); };
    const upload = vi.fn(() => new Promise<string>(resolve => { resolveUpload = resolve; }));
    const onchange = vi.fn();
    const view = render(Editor, { value: '<p>Text</p>', onUpload: upload, onchange });
    const { instance } = await activeEditor(view.container);
    const file = new File(['image'], 'late.png', { type: 'image/png' });
    const editorProps = requireValue(instance.options.editorProps);
    if (!editorProps.handleDrop || !editorProps.handlePaste) throw new Error('Expected upload handlers');
    const slice = instance.state.doc.slice(0, 0);
    vi.spyOn(instance.view, 'posAtCoords').mockReturnValue({ pos: 1, inside: 0 });
    const handled = method === 'drop'
      ? editorProps.handleDrop(instance.view, dragFile(file), slice, false)
      : editorProps.handlePaste(instance.view, pasteFile(file), slice);
    expect(handled).toBe(true);
    expect(upload).toHaveBeenCalledExactlyOnceWith(file);
    if (change === 'disabled' || change === 'reenabled') await view.rerender({ disabled: true });
    if (change === 'reenabled') await view.rerender({ disabled: false });
    if (change === 'readonly') await view.rerender({ editable: false });
    if (change === 'reconfigured') await view.rerender({ preset: 'minimal' });
    if (change === 'unmount') view.unmount();
    if (change === 'handler') await view.rerender({ onUpload: async () => 'https://example.test/replacement.png' });
    resolveUpload('https://example.test/late.png');
    await act(async () => { await Promise.resolve(); });
    if (change === 'unmount') expect(instance.isDestroyed).toBe(true);
    else {
      const current = await activeEditor(view.container);
      expect(current.instance.getHTML()).toBe('<p>Text</p>');
    }
    expect(onchange).not.toHaveBeenCalled();
  });

  it('allows new uploads after disablement without accepting old receipts', async () => {
    const upload = vi.fn(async () => 'https://example.test/current.png');
    const onchange = vi.fn();
    const view = render(Editor, { value: '<p>Text</p>', disabled: true, onUpload: upload, onchange });
    const { instance } = await activeEditor(view.container);
    const currentFile = new File(['image'], 'current.png', { type: 'image/png' });
    const editorProps = requireValue(instance.options.editorProps);
    if (!editorProps.handleDrop) throw new Error('Expected drop handler');
    const event = dragFile(currentFile);
    const slice = instance.state.doc.slice(0, 0);
    expect(editorProps.handleDrop(instance.view, event, slice, false)).toBe(false);
    expect(upload).not.toHaveBeenCalled();
    await view.rerender({ disabled: false });
    vi.spyOn(instance.view, 'posAtCoords').mockReturnValue({ pos: 1, inside: 0 });
    await act(async () => { editorProps.handleDrop?.(instance.view, event, slice, false); });
    await waitFor(() => expect(instance.getHTML()).toContain('https://example.test/current.png'));
    expect(upload).toHaveBeenCalledTimes(1);
    expect(onchange).toHaveBeenCalledTimes(1);
  });

  it('still rebuilds extensions when the host changes the preset', async () => {
    const onchange = vi.fn();
    const view = render(Editor, {
      value: '<p>Keep content</p>', preset: 'minimal', showToolbar: false, onchange,
    });
    const previous = await activeEditor(view.container);
    expect(previous.instance.schema.nodes['table']).toBeUndefined();
    await view.rerender({ preset: 'full' });
    const current = await activeEditor(view.container);
    expect(previous.instance.isDestroyed).toBe(true);
    expect(current.instance).not.toBe(previous.instance);
    expect(current.instance.schema.nodes['table']).toBeDefined();
    expect(current.instance.getHTML()).toBe('<p>Keep content</p>');
    expect(onchange).not.toHaveBeenCalled();
  });

  it('forwards lazy field attributes to a single editing-area ID', async () => {
    const onchange = vi.fn();
    const view = render(LazyEditor, {
      id: 'lazy-body', value: '<p>Lazy</p>', disabled: true, preset: 'minimal',
      'aria-label': 'Lazy body', 'aria-invalid': true, 'aria-describedby': 'lazy-help', onchange,
    });
    const { content, instance } = await activeEditor(view.container);
    expect(within(view.container).getByRole('textbox', { name: 'Lazy body' })).toBe(content);
    expect(view.container.querySelectorAll('#lazy-body')).toHaveLength(1);
    expect(content.id).toBe('lazy-body');
    expect(content.getAttribute('aria-describedby')).toBe('lazy-help');
    expect(content.getAttribute('aria-invalid')).toBe('true');
    expect(instance.isEditable).toBe(false);
    await view.rerender({ disabled: false, 'aria-invalid': false, 'aria-describedby': 'updated-help' });
    expect(view.container.querySelector('.tiptap')).toBe(content);
    expect(content.getAttribute('aria-describedby')).toBe('updated-help');
    expect(content.getAttribute('aria-invalid')).toBe('false');
    expect(instance.isEditable).toBe(true);
    expect(onchange).not.toHaveBeenCalled();
  });
});
