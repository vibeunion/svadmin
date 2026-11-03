import { describe, it, expect, beforeEach } from 'vitest';
import {
  setStorageProvider,
  getStorageProvider,
  useStorage,
  resetContext,
} from './index';
import type { StorageProvider, StorageUploadOptions, StorageUploadResult, StorageFileItem } from './storage-contract';

class MockStorageProvider implements StorageProvider {
  files = new Map<string, { content: Uint8Array; metadata?: Record<string, string> }>();

  async upload(
    file: File | Blob | ArrayBuffer | Uint8Array,
    options?: StorageUploadOptions,
  ): Promise<StorageUploadResult> {
    const filename = options?.filename ?? 'test.bin';
    const path = options?.path ? `${options.path}/${filename}` : filename;
    let bytes: Uint8Array;
    if (file instanceof Uint8Array) {
      bytes = file;
    } else if (file instanceof ArrayBuffer) {
      bytes = new Uint8Array(file);
    } else {
      bytes = new Uint8Array(await file.arrayBuffer());
    }
    this.files.set(path, {
      content: bytes,
      ...(options?.metadata === undefined ? {} : { metadata: options.metadata }),
    });
    options?.onProgress?.({ loaded: bytes.byteLength, total: bytes.byteLength, percentage: 100 });
    return {
      url: `https://mock.storage/${path}`,
      path,
      size: bytes.byteLength,
      contentType: options?.contentType ?? 'application/octet-stream',
      ...(options?.metadata === undefined ? {} : { metadata: options.metadata }),
    };
  }

  async delete(path: string): Promise<void> {
    this.files.delete(path);
  }

  async getPresignedUrl(path: string): Promise<string> {
    return `https://mock.storage/signed/${path}?token=valid`;
  }

  async list(): Promise<StorageFileItem[]> {
    return Array.from(this.files.entries()).map(([path, data]) => ({
      name: path.split('/').pop() ?? path,
      path,
      size: data.content.byteLength,
      url: `https://mock.storage/${path}`,
    }));
  }
}

describe('StorageProvider Contract & useStorage', () => {
  beforeEach(() => {
    resetContext();
  });

  it('manages storage provider registration and retrieval', () => {
    expect(getStorageProvider({ optional: true })).toBeUndefined();
    expect(() => getStorageProvider()).toThrow('StorageProvider not found');

    const provider = new MockStorageProvider();
    setStorageProvider(provider);
    expect(getStorageProvider()).toBe(provider);
  });

  it('uploads, gets signed URL, lists, and deletes files via useStorage', async () => {
    const provider = new MockStorageProvider();
    setStorageProvider(provider);

    const storage = useStorage();
    expect(storage.isUploading).toBe(false);
    expect(storage.uploadProgress).toBe(0);

    const testData = new Uint8Array([1, 2, 3, 4, 5]);
    const res = await storage.upload(testData, { filename: 'avatar.png', path: 'uploads' });

    expect(res.path).toBe('uploads/avatar.png');
    expect(res.size).toBe(5);
    expect(res.url).toBe('https://mock.storage/uploads/avatar.png');
    expect(storage.uploadProgress).toBe(100);

    const signedUrl = await storage.getDownloadUrl('uploads/avatar.png');
    expect(signedUrl).toBe('https://mock.storage/signed/uploads/avatar.png?token=valid');

    const list = await storage.listFiles();
    expect(list.length).toBe(1);
    expect(list[0]?.name).toBe('avatar.png');

    await storage.deleteFile('uploads/avatar.png');
    const afterDelete = await storage.listFiles();
    expect(afterDelete.length).toBe(0);
  });
});
