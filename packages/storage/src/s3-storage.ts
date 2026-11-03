import type {
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
  StorageFileItem,
  StorageListOptions,
  StoragePresignedUrlOptions,
} from '@svadmin/core';

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface S3StorageOptions {
  /** S3 or S3-compatible (Cloudflare R2, MinIO, Wasabi) bucket name */
  bucket: string;
  /** Public or CDN base URL for downloading files */
  publicUrl?: string;
  /**
   * Function to request a presigned PUT URL from your backend or serverless handler.
   * Enables direct client-to-storage uploads without exposing credentials.
   */
  getPresignedUploadUrl?: (params: { path: string; contentType?: string }) => Promise<{ uploadUrl: string; downloadUrl?: string }>;
  /** Request a signed download or upload URL from the backend. */
  getPresignedUrl?: (params: { path: string; operation: 'get' | 'put'; expiresInSeconds: number }) => Promise<string>;
  /** List objects through a backend endpoint; direct bucket listing is not exposed to browsers. */
  listFiles?: (options?: StorageListOptions) => Promise<StorageFileItem[]>;
  /**
   * Custom fetch implementation
   */
  fetch?: FetchLike;
}

export function createS3StorageProvider(options: S3StorageOptions): StorageProvider {
  const customFetch = options.fetch ?? fetch;
  const publicBaseUrl = (options.publicUrl ?? `https://${options.bucket}.s3.amazonaws.com`).replace(/\/+$/, '');

  return {
    async upload(file: File | Blob | ArrayBuffer | Uint8Array, uploadOptions?: StorageUploadOptions): Promise<StorageUploadResult> {
      const filename = uploadOptions?.filename ?? (typeof File !== 'undefined' && file instanceof File ? file.name : 'upload.bin');
      const dir = uploadOptions?.path ? uploadOptions.path.replace(/^\/+|\/+$/g, '') : '';
      const fullPath = dir ? `${dir}/${filename}` : filename;
      const contentType = uploadOptions?.contentType ?? (typeof File !== 'undefined' && file instanceof File ? file.type : 'application/octet-stream');

      let bodyData: BodyInit;
      let byteSize: number | undefined;

      if (file instanceof Uint8Array || file instanceof ArrayBuffer) {
        bodyData = file as BodyInit;
        byteSize = file.byteLength;
      } else {
        bodyData = file;
        byteSize = file.size;
      }

      if (options.getPresignedUploadUrl) {
        const presigned = await options.getPresignedUploadUrl({
          path: fullPath,
          contentType,
        });

        const uploadRes = await customFetch(presigned.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType || 'application/octet-stream',
          },
          body: bodyData,
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload to presigned S3 URL: ${uploadRes.status} ${uploadRes.statusText}`);
        }

        uploadOptions?.onProgress?.({
          loaded: byteSize ?? 100,
          total: byteSize ?? 100,
          percentage: 100,
        });

        return {
          url: presigned.downloadUrl ?? `${publicBaseUrl}/${fullPath}`,
          path: fullPath,
          size: byteSize,
          contentType,
          ...(uploadOptions?.metadata === undefined ? {} : { metadata: uploadOptions.metadata }),
        };
      }

      throw new Error('S3 storage upload requires getPresignedUploadUrl');
    },

    async delete(path: string): Promise<void> {
      // In client mode, delete operations typically call the backend API
      const cleanPath = path.replace(/^\/+/, '');
      const response = await customFetch(`${publicBaseUrl}/${cleanPath}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`Failed to delete storage object: ${response.status} ${response.statusText}`);
    },

    async getPresignedUrl(path: string, presignedOptions?: StoragePresignedUrlOptions): Promise<string> {
      const cleanPath = path.replace(/^\/+/, '');
      const op = presignedOptions?.operation ?? 'get';
      const expires = presignedOptions?.expiresInSeconds ?? 3600;
      if (!options.getPresignedUrl) throw new Error('S3 storage presigned URLs require getPresignedUrl');
      return options.getPresignedUrl({ path: cleanPath, operation: op, expiresInSeconds: expires });
    },

    async list(listOptions?: StorageListOptions): Promise<StorageFileItem[]> {
      if (!options.listFiles) throw new Error('S3 storage listing requires listFiles');
      return options.listFiles(listOptions);
    },
  };
}
