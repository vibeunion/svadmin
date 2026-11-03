import type { StorageProvider, StorageUploadOptions, StorageUploadResult } from '@svadmin/core';

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
}

export function validateFile(file: File | Blob, options: FileValidationOptions): { valid: boolean; error?: string } {
  if (options.maxSizeBytes && file.size > options.maxSizeBytes) {
    const maxMb = (options.maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${maxMb}MB`,
    };
  }

  if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0 && file.type) {
    const isAllowed = options.allowedMimeTypes.some((pattern) => {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -1);
        return file.type.startsWith(prefix);
      }
      return file.type === pattern;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `File type "${file.type}" is not allowed. Supported: ${options.allowedMimeTypes.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

export interface BatchUploadOptions extends StorageUploadOptions {
  concurrency?: number;
  onOverallProgress?: (progress: { completed: number; total: number; percentage: number }) => void;
}

export async function uploadBatch(
  storage: StorageProvider,
  files: (File | Blob)[],
  options: BatchUploadOptions = {},
): Promise<StorageUploadResult[]> {
  const total = files.length;
  if (total === 0) return [];

  const { concurrency: requestedConcurrency, onOverallProgress, ...uploadOptions } = options;
  const concurrency = Math.max(1, requestedConcurrency ?? 3);
  const results: StorageUploadResult[] = new Array(total);
  let completed = 0;

  async function uploadWorker(startIndex: number, step: number) {
    for (let i = startIndex; i < total; i += step) {
      const file = files[i];
      if (!file) throw new Error(`Missing file at batch index ${i}`);
      const filename = typeof File !== 'undefined' && file instanceof File ? file.name : `file-${i}.bin`;
      const res = await storage.upload(file, {
        ...uploadOptions,
        filename: uploadOptions.filename ? `${i}-${uploadOptions.filename}` : filename,
      });
      results[i] = res;
      completed++;
      onOverallProgress?.({
        completed,
        total,
        percentage: Math.round((completed / total) * 100),
      });
    }
  }

  const workers: Promise<void>[] = [];
  for (let c = 0; c < Math.min(concurrency, total); c++) {
    workers.push(uploadWorker(c, concurrency));
  }

  await Promise.all(workers);
  return results;
}
