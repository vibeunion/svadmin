import type { AttachmentDataLike, AttachmentMediaCategory } from './types.js';

export function getMediaCategory(data: AttachmentDataLike): AttachmentMediaCategory {
  if ('type' in data && data.type === 'source-document') return 'source';

  const mediaType = data.mediaType ?? '';
  if (mediaType.startsWith('image/')) return 'image';
  if (mediaType.startsWith('video/')) return 'video';
  if (mediaType.startsWith('audio/')) return 'audio';
  if (mediaType.startsWith('application/') || mediaType.startsWith('text/')) return 'document';
  return 'unknown';
}

export function getAttachmentLabel(data: AttachmentDataLike): string {
  if ('type' in data && data.type === 'source-document') {
    return data.title || data.filename || 'Source';
  }

  const filename = 'filename' in data ? data.filename : 'name' in data ? data.name : undefined;
  return filename || (getMediaCategory(data) === 'image' ? 'Image' : 'Attachment');
}
