export { getAttachmentLabel, getMediaCategory } from './attachments.js';
export { useAttachmentContext, useAttachmentsContext } from './context.svelte.js';
export { default, default as Root, default as Attachments } from './Attachments.svelte';
export { default as Attachment } from './Attachment.svelte';
export { default as AttachmentPreview, default as Preview } from './AttachmentPreview.svelte';
export { default as AttachmentInfo, default as Info } from './AttachmentInfo.svelte';
export { default as AttachmentRemove, default as Remove } from './AttachmentRemove.svelte';
export { default as AttachmentHoverCard, default as HoverCard } from './AttachmentHoverCard.svelte';
export { default as AttachmentHoverCardTrigger, default as HoverCardTrigger } from './AttachmentHoverCardTrigger.svelte';
export { default as AttachmentHoverCardContent, default as HoverCardContent } from './AttachmentHoverCardContent.svelte';
export { default as AttachmentEmpty, default as Empty } from './AttachmentEmpty.svelte';

export type { AttachmentsProps } from './Attachments.svelte';
export type { AttachmentProps } from './Attachment.svelte';
export type { AttachmentPreviewProps } from './AttachmentPreview.svelte';
export type { AttachmentInfoProps } from './AttachmentInfo.svelte';
export type { AttachmentRemoveProps } from './AttachmentRemove.svelte';
export type { AttachmentHoverCardProps } from './AttachmentHoverCard.svelte';
export type { AttachmentHoverCardTriggerProps } from './AttachmentHoverCardTrigger.svelte';
export type { AttachmentHoverCardContentProps } from './AttachmentHoverCardContent.svelte';
export type { AttachmentEmptyProps } from './AttachmentEmpty.svelte';
export type {
  AttachmentData,
  AttachmentDataLike,
  AttachmentMediaCategory,
  AttachmentVariant,
  FileAttachmentData,
  SourceDocumentAttachmentData,
} from './types.js';
