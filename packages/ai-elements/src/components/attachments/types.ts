import type { ChatAttachment } from '../../contracts.js';

export type AttachmentMediaCategory = 'image' | 'video' | 'audio' | 'document' | 'source' | 'unknown';
export type AttachmentVariant = 'grid' | 'inline' | 'list';

export interface FileAttachmentData {
  id: string;
  type: 'file';
  mediaType?: string;
  filename?: string;
  url?: string;
}

export interface SourceDocumentAttachmentData {
  id: string;
  type: 'source-document';
  sourceId?: string;
  mediaType?: string;
  title?: string;
  filename?: string;
  url?: string;
}

export type AttachmentData = FileAttachmentData | SourceDocumentAttachmentData;
export type AttachmentDataLike = AttachmentData | ChatAttachment;

export function normalizeAttachmentData(data: AttachmentDataLike): AttachmentData {
  if ('type' in data) return data;
  return {
    id: data.id,
    type: 'file',
    mediaType: data.mediaType,
    filename: data.name,
    url: data.url,
  };
}
