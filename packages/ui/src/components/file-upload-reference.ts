import type { UploadItem } from './file-upload-types.js';

/** 上传成功后写入表单的 JSON 引用；保留服务端返回的全部标识。 */
export type UploadReference = Pick<UploadItem, 'url' | 'uploadId'>;

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export function uploadReference(value: unknown): UploadReference | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const descriptor = (key: 'url' | 'uploadId') => Object.getOwnPropertyDescriptor(value, key);
  const read = (key: 'url' | 'uploadId') => {
    const entry = descriptor(key);
    return entry && 'value' in entry ? text(entry.value) : undefined;
  };
  const url = read('url');
  const uploadId = read('uploadId');
  if (url === undefined && uploadId === undefined) return undefined;
  return {
    ...(url === undefined ? {} : { url }),
    ...(uploadId === undefined ? {} : { uploadId }),
  };
}

export function uploadReferenceFor(item: Pick<UploadItem, 'status' | 'url' | 'uploadId'>): UploadReference | undefined {
  return item.status === 'success' ? uploadReference(item) : undefined;
}

/** 兼容历史字符串基线；只读取 plain object 自身数据属性。 */
export function normalizeUploadReferences(value: unknown): UploadReference[] {
  const entries = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
  return entries.flatMap(entry => {
    if (typeof entry === 'string' && entry.length > 0) return [{ url: entry }];
    const reference = uploadReference(entry);
    return reference === undefined ? [] : [reference];
  });
}
export function uploadReferenceKey(reference: UploadReference): string {
  return JSON.stringify([reference.url ?? null, reference.uploadId ?? null]);
}

/** 纯文本回显：优先 URL，其次 uploadId，避免把引用渲染成可点击链接。 */
export function uploadReferenceLabel(reference: UploadReference): string {
  return reference.url ?? reference.uploadId ?? '';
}

export function mergeUploadReferences(baseline: UploadReference[], uploaded: UploadReference[]): UploadReference[] {
  const seen = new Set<string>();
  return [...baseline, ...uploaded].filter(reference => {
    const key = uploadReferenceKey(reference);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
