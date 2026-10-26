/** FileUpload 的共享队列与回调契约；单独文件便于非 Svelte 单元静态检查。 */
export type UploadItemStatus = 'queued' | 'uploading' | 'success' | 'error' | 'cancelled';

export interface UploadItem {
  id: string;
  file: File;
  status: UploadItemStatus;
  progress: number;
  url?: string;
  error?: string;
  uploadId?: string;
  cleanupStatus?: 'pending' | 'success' | 'error';
}

export interface UploadSession {
  signal: AbortSignal;
  idempotencyKey: string;
  setUploadId: (uploadId: string) => void;
  onProgress: (progress: number) => void;
}

export interface UploadCancellation {
  uploadId: string;
  idempotencyKey: string;
  reason: 'cancel' | 'remove' | 'replace' | 'scope-change' | 'unmount';
}

export interface UploadHandler {
  (file: File, session: UploadSession):
    Promise<{ url?: string; uploadId?: string } | undefined> | Promise<void>;
}

export interface UploadCancelHandler {
  (file: File, cancellation: UploadCancellation): Promise<void>;
}
