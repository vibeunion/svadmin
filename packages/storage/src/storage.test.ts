import { describe, expect, it } from 'bun:test';
import { createMemoryStorageProvider } from './memory-storage';
import { createS3StorageProvider, type FetchLike } from './s3-storage';
import { validateFile, uploadBatch } from './upload-utils';

describe('@svadmin/storage Memory Provider', () => {
  it('handles uploads, signed URLs, listing, and deletion', async () => {
    const storage = createMemoryStorageProvider({ baseUrl: 'https://cdn.example.com' });

    const data = new Uint8Array([65, 66, 67]);
    const uploadRes = await storage.upload(data, {
      filename: 'sample.txt',
      path: 'documents',
      contentType: 'text/plain',
      metadata: { author: 'admin' },
    });

    expect(uploadRes.path).toBe('documents/sample.txt');
    expect(uploadRes.url).toBe('https://cdn.example.com/documents/sample.txt');
    expect(uploadRes.size).toBe(3);
    expect(uploadRes.metadata?.['author']).toBe('admin');

    const signed = await storage.getPresignedUrl?.('documents/sample.txt');
    expect(signed).toContain('https://cdn.example.com/documents/sample.txt?op=get');

    const list = await storage.list?.({ prefix: 'documents' });
    expect(list?.length).toBe(1);
    expect(list?.[0]?.name).toBe('sample.txt');

    await storage.delete('documents/sample.txt');
    const afterDelete = await storage.list?.({ prefix: 'documents' });
    expect(afterDelete?.length).toBe(0);
  });
});

describe('@svadmin/storage S3 Provider', () => {
  it('uploads via presigned URL hook when provided', async () => {
    let putCalled = false;
    let putHeaders: Record<string, string> = {};

    const mockFetch: FetchLike = async (input, init) => {
      if (init?.method === 'PUT') {
        putCalled = true;
        putHeaders = (init.headers as Record<string, string>) ?? {};
        return new Response('', { status: 200, statusText: 'OK' });
      }
      return new Response('', { status: 200 });
    };

    const s3 = createS3StorageProvider({
      bucket: 'my-bucket',
      publicUrl: 'https://cdn.my-bucket.com',
      getPresignedUploadUrl: async ({ path, contentType: _contentType }) => ({
        uploadUrl: `https://my-bucket.s3.amazonaws.com/${path}?signed=true`,
        downloadUrl: `https://cdn.my-bucket.com/${path}`,
      }),
      fetch: mockFetch,
    });

    const data = new Uint8Array([1, 2, 3, 4]);
    const res = await s3.upload(data, {
      filename: 'image.png',
      contentType: 'image/png',
    });

    expect(putCalled).toBe(true);
    expect(putHeaders['Content-Type']).toBe('image/png');
    expect(res.url).toBe('https://cdn.my-bucket.com/image.png');
    expect(res.path).toBe('image.png');
  });

  it('fails closed when upload signing is not configured', async () => {
    const storage = createS3StorageProvider({ bucket: 'my-bucket' });
    await expect(storage.upload(new Uint8Array([1]))).rejects.toThrow('getPresignedUploadUrl');
  });

  it('uses backend signing and surfaces delete failures', async () => {
    const storage = createS3StorageProvider({
      bucket: 'my-bucket',
      getPresignedUrl: async ({ path, operation }) => `https://signed.example/${path}?operation=${operation}`,
      fetch: async (): Promise<Response> => new Response('', { status: 403, statusText: 'Forbidden' }),
    });

    await expect(storage.getPresignedUrl?.('docs/a.txt')).resolves.toBe('https://signed.example/docs/a.txt?operation=get');
    await expect(storage.delete('docs/a.txt')).rejects.toThrow('403 Forbidden');
  });
});

describe('@svadmin/storage Utilities', () => {
  it('validates file size and mime types', () => {
    const file = new Blob(['hello world'], { type: 'text/plain' });

    const sizeCheck = validateFile(file, { maxSizeBytes: 5 });
    expect(sizeCheck.valid).toBe(false);
    expect(sizeCheck.error).toContain('maximum limit');

    const mimeCheck = validateFile(file, { allowedMimeTypes: ['image/*', 'application/pdf'] });
    expect(mimeCheck.valid).toBe(false);
    expect(mimeCheck.error).toContain('not allowed');

    const validCheck = validateFile(file, { maxSizeBytes: 100, allowedMimeTypes: ['text/*'] });
    expect(validCheck.valid).toBe(true);
  });

  it('uploads a batch of files with progress tracking', async () => {
    const storage = createMemoryStorageProvider();
    const files = [
      new Blob(['file 1'], { type: 'text/plain' }),
      new Blob(['file 2'], { type: 'text/plain' }),
      new Blob(['file 3'], { type: 'text/plain' }),
    ];

    let progressCalls = 0;
    const results = await uploadBatch(storage, files, {
      path: 'batch-test',
      concurrency: 2,
      onOverallProgress: (p) => {
        progressCalls++;
        expect(p.total).toBe(3);
      },
    });

    expect(results.length).toBe(3);
    expect(progressCalls).toBeGreaterThanOrEqual(3);
    expect(results[0].path).toContain('batch-test');
  });
});
