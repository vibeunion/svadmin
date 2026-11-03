import { describe, expect, it } from 'bun:test';
import { createMemoryStorageProvider } from './memory-storage';
import { createS3StorageProvider } from './s3-storage';

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
    expect(uploadRes.metadata?.author).toBe('admin');

    const signed = await storage.getPresignedUrl?.('documents/sample.txt');
    expect(signed).toContain('https://cdn.example.com/documents/sample.txt?op=get');

    const list = await storage.list?.({ prefix: 'documents' });
    expect(list?.length).toBe(1);
    expect(list?.[0].name).toBe('sample.txt');

    await storage.delete('documents/sample.txt');
    const afterDelete = await storage.list?.({ prefix: 'documents' });
    expect(afterDelete?.length).toBe(0);
  });
});

describe('@svadmin/storage S3 Provider', () => {
  it('uploads via presigned URL hook when provided', async () => {
    let putCalled = false;
    let putHeaders: Record<string, string> = {};

    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
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
      getPresignedUploadUrl: async ({ path, contentType }) => ({
        uploadUrl: `https://my-bucket.s3.amazonaws.com/${path}?signed=true`,
        downloadUrl: `https://cdn.my-bucket.com/${path}`,
      }),
      fetch: mockFetch as any,
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
});
