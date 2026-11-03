import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { setStorageProvider, resetContext } from '@svadmin/core';
import UploadField from './UploadField.svelte';

class MockStorageProvider {
  uploads: string[] = [];
  async upload(file: any) {
    const name = file.name || 'test.bin';
    const url = `https://storage.mock/${name}`;
    this.uploads.push(url);
    return { url, path: name, size: 100 };
  }
  async delete(path: string) {
    this.uploads = this.uploads.filter((u) => !u.endsWith(path));
  }
}

describe('UploadField.svelte', () => {
  it('renders dropzone with label and initial value list', () => {
    resetContext();
    setStorageProvider(new MockStorageProvider() as any);

    render(UploadField, {
      label: 'Attachment',
      value: 'https://cdn.example.com/docs/contract.pdf',
    });

    expect(screen.getByText('Attachment')).toBeDefined();
    expect(screen.getByText('contract.pdf')).toBeDefined();
    expect(screen.getByText(/Click to upload/)).toBeDefined();
  });

  it('allows removing an uploaded item', async () => {
    resetContext();
    setStorageProvider(new MockStorageProvider() as any);

    render(UploadField, {
      value: ['https://cdn.example.com/avatar1.png', 'https://cdn.example.com/avatar2.png'],
      multiple: true,
    });

    expect(screen.getByText('avatar1.png')).toBeDefined();
    expect(screen.getByText('avatar2.png')).toBeDefined();

    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    expect(removeButtons.length).toBe(2);

    await fireEvent.click(removeButtons[0]);
    expect(screen.queryByText('avatar1.png')).toBeNull();
    expect(screen.getByText('avatar2.png')).toBeDefined();
  });
});
