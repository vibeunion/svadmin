import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { setStorageProvider, resetContext } from '@svadmin/core';
import type { StorageProvider, StorageUploadOptions, StorageUploadResult } from '@svadmin/core';
import UploadField from './UploadField.svelte';

class MockStorageProvider implements StorageProvider {
  uploads: string[] = [];
  deleted: string[] = [];
  async upload(file: File | Blob | ArrayBuffer | Uint8Array, _options?: StorageUploadOptions): Promise<StorageUploadResult> {
    const fileRecord = typeof File !== 'undefined' && file instanceof File ? file : undefined;
    const name = fileRecord?.name ?? 'test.bin';
    const url = `https://storage.mock/${name}`;
    this.uploads.push(url);
    return { url, path: `objects/${name}`, size: 100 };
  }
  async delete(path: string): Promise<void> {
    this.deleted.push(path);
    this.uploads = this.uploads.filter((u) => !u.endsWith(path));
  }
}

describe('UploadField.svelte', () => {
  it('renders dropzone with label and initial value list', () => {
    resetContext();
    setStorageProvider(new MockStorageProvider());

    render(UploadField, {
      label: 'Attachment',
      value: 'https://cdn.example.com/docs/contract.pdf',
    });

    expect(screen.getByText('Attachment')).toBeDefined();
    expect(screen.getByText('contract.pdf')).toBeDefined();
    expect(screen.getByText(/Click to upload/)).toBeDefined();
  });


  it('uses an injected storage adapter without a context provider', async () => {
    resetContext();
    const storage = new MockStorageProvider();
    const onchange = vi.fn();

    const view = render(UploadField, { storage, onchange });
    const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('Expected a file input');
    const transfer = new DataTransfer();
    transfer.items.add(new File(['contract'], 'contract.txt', { type: 'text/plain' }));
    await fireEvent.change(input, { target: { files: transfer.files } });

    await waitFor(() => expect(storage.uploads).toEqual(['https://storage.mock/contract.txt']));
    expect(onchange).toHaveBeenCalledWith('https://storage.mock/contract.txt');
    expect(screen.getByRole('link', { name: 'contract.txt' })).toBeDefined();
  });

  it('uses the injected adapter for removal', async () => {
    resetContext();
    const storage = new MockStorageProvider();

    const view = render(UploadField, { storage });
    const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('Expected a file input');
    const transfer = new DataTransfer();
    transfer.items.add(new File(['contract'], 'contract.txt', { type: 'text/plain' }));
    await fireEvent.change(input, { target: { files: transfer.files } });

    await waitFor(() => expect(storage.uploads).toEqual(['https://storage.mock/contract.txt']));

    await fireEvent.click(screen.getByRole('button', { name: 'Remove contract.txt' }));
    await waitFor(() => expect(storage.deleted).toEqual(['objects/contract.txt']));
  });

  it('allows removing an uploaded item', async () => {
    resetContext();
    setStorageProvider(new MockStorageProvider());

    render(UploadField, {
      value: ['https://cdn.example.com/avatar1.png', 'https://cdn.example.com/avatar2.png'],
      multiple: true,
    });

    expect(screen.getByText('avatar1.png')).toBeDefined();
    expect(screen.getByText('avatar2.png')).toBeDefined();

    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    expect(removeButtons.length).toBe(2);

    const firstRemoveButton = removeButtons[0];
    if (!firstRemoveButton) throw new Error('Expected a remove button');
    await fireEvent.click(firstRemoveButton);
    expect(screen.queryByText('avatar1.png')).toBeNull();
    expect(screen.getByText('avatar2.png')).toBeDefined();
  });
});
