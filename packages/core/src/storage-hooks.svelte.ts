import { captureAdminContext } from './context.svelte';
import type {
  StorageUploadOptions,
  StorageUploadResult,
  StorageFileItem,
  StorageListOptions,
} from './storage-contract';

export function useStorage() {
  const context = captureAdminContext();
  const provider = context.storageProvider;

  let isUploading = $state(false);
  let uploadProgress = $state(0);
  let error = $state<Error | null>(null);

  async function upload(
    file: File | Blob | ArrayBuffer | Uint8Array,
    options?: StorageUploadOptions,
  ): Promise<StorageUploadResult> {
    if (!provider) {
      throw new Error('StorageProvider not configured. Set storageProvider in context or call setStorageProvider().');
    }
    isUploading = true;
    uploadProgress = 0;
    error = null;
    try {
      const result = await provider.upload(file, {
        ...options,
        onProgress: (p) => {
          uploadProgress = p.percentage;
          options?.onProgress?.(p);
        },
      });
      return result;
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      throw err;
    } finally {
      isUploading = false;
    }
  }

  async function deleteFile(path: string): Promise<void> {
    if (!provider) {
      throw new Error('StorageProvider not configured.');
    }
    return provider.delete(path);
  }

  async function getDownloadUrl(path: string, options?: { expiresInSeconds?: number }): Promise<string> {
    if (!provider) {
      throw new Error('StorageProvider not configured.');
    }
    if (provider.getPresignedUrl) {
      return provider.getPresignedUrl(path, { operation: 'get', ...options });
    }
    return path;
  }

  async function listFiles(options?: StorageListOptions): Promise<StorageFileItem[]> {
    if (!provider?.list) {
      return [];
    }
    return provider.list(options);
  }

  return {
    get provider() {
      return provider;
    },
    get isUploading() {
      return isUploading;
    },
    get uploadProgress() {
      return uploadProgress;
    },
    get error() {
      return error;
    },
    upload,
    deleteFile,
    getDownloadUrl,
    listFiles,
  };
}
