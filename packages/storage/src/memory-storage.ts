import type {
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
  StorageFileItem,
  StorageListOptions,
  StoragePresignedUrlOptions,
} from '@svadmin/core';

export interface MemoryStorageOptions {
  baseUrl?: string;
}

export function createMemoryStorageProvider(options: MemoryStorageOptions = {}): StorageProvider {
  const baseUrl = (options.baseUrl ?? 'https://storage.local').replace(/\/+$/, '');
  const files = new Map<string, { bytes: Uint8Array; contentType: string; metadata?: Record<string, string>; updatedAt: Date }>();

  return {
    async upload(file: File | Blob | ArrayBuffer | Uint8Array, uploadOptions?: StorageUploadOptions): Promise<StorageUploadResult> {
      const filename = uploadOptions?.filename ?? (file instanceof File ? file.name : 'upload.bin');
      const dir = uploadOptions?.path ? uploadOptions.path.replace(/^\/+|\/+$/g, '') : '';
      const fullPath = dir ? `${dir}/${filename}` : filename;

      let bytes: Uint8Array;
      if (file instanceof Uint8Array) {
        bytes = file;
      } else if (file instanceof ArrayBuffer) {
        bytes = new Uint8Array(file);
      } else {
        bytes = new Uint8Array(await file.arrayBuffer());
      }

      const contentType = uploadOptions?.contentType ?? (typeof File !== 'undefined' && file instanceof File ? file.type : 'application/octet-stream');
      files.set(fullPath, {
        bytes,
        contentType: contentType || 'application/octet-stream',
        updatedAt: new Date(),
        ...(uploadOptions?.metadata === undefined ? {} : { metadata: uploadOptions.metadata }),
      });

      uploadOptions?.onProgress?.({
        loaded: bytes.byteLength,
        total: bytes.byteLength,
        percentage: 100,
      });

      return {
        url: `${baseUrl}/${fullPath}`,
        path: fullPath,
        size: bytes.byteLength,
        contentType,
        ...(uploadOptions?.metadata === undefined ? {} : { metadata: uploadOptions.metadata }),
      };
    },

    async delete(path: string): Promise<void> {
      const cleanPath = path.replace(/^\/+/, '');
      files.delete(cleanPath);
    },

    async getPresignedUrl(path: string, presignedOptions?: StoragePresignedUrlOptions): Promise<string> {
      const cleanPath = path.replace(/^\/+/, '');
      const op = presignedOptions?.operation ?? 'get';
      const expires = presignedOptions?.expiresInSeconds ?? 3600;
      return `${baseUrl}/${cleanPath}?op=${op}&expires=${expires}&signature=mock-sig`;
    },

    async list(listOptions?: StorageListOptions): Promise<StorageFileItem[]> {
      const prefix = listOptions?.prefix ? listOptions.prefix.replace(/^\/+/, '') : '';
      const limit = listOptions?.limit ?? 1000;
      const result: StorageFileItem[] = [];

      for (const [key, value] of files.entries()) {
        if (!prefix || key.startsWith(prefix)) {
          result.push({
            name: key.split('/').pop() ?? key,
            path: key,
            size: value.bytes.byteLength,
            lastModified: value.updatedAt,
            url: `${baseUrl}/${key}`,
          });
          if (result.length >= limit) break;
        }
      }

      return result;
    },
  };
}
