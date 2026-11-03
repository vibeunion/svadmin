export interface StorageUploadOptions {
  path?: string;
  filename?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void;
}

export interface StorageUploadResult {
  url: string;
  path: string;
  size?: number;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StoragePresignedUrlOptions {
  expiresInSeconds?: number;
  operation?: 'get' | 'put';
}

export interface StorageFileItem {
  name: string;
  path: string;
  size?: number;
  lastModified?: string | Date;
  url?: string;
}

export interface StorageListOptions {
  prefix?: string;
  limit?: number;
}

export interface StorageProvider {
  upload(file: File | Blob | ArrayBuffer | Uint8Array, options?: StorageUploadOptions): Promise<StorageUploadResult>;
  delete(path: string): Promise<void>;
  getPresignedUrl?(path: string, options?: StoragePresignedUrlOptions): Promise<string>;
  list?(options?: StorageListOptions): Promise<StorageFileItem[]>;
}
