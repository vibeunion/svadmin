import { createContext } from 'svelte';
import type { AttachmentData, AttachmentMediaCategory, AttachmentVariant } from './types.js';

export interface AttachmentsContextValue {
  readonly variant: AttachmentVariant;
}

export interface AttachmentContextValue extends AttachmentsContextValue {
  readonly data: AttachmentData;
  readonly mediaCategory: AttachmentMediaCategory;
  readonly onRemove?: () => void;
}

export interface AttachmentHoverCardContextValue {
  readonly open: boolean;
  readonly contentId: string;
  setOpen(open: boolean): void;
  scheduleOpen(): void;
  scheduleClose(): void;
  cancelClose(): void;
}

const [getAttachmentsContext, setAttachmentsContext] = createContext<AttachmentsContextValue>();
const [getAttachmentContext, setAttachmentContext] = createContext<AttachmentContextValue>();
const [getAttachmentHoverCardContext, setAttachmentHoverCardContext] = createContext<AttachmentHoverCardContextValue>();

const defaultAttachmentsContext: AttachmentsContextValue = { variant: 'grid' };

export function provideAttachmentsContext(value: AttachmentsContextValue): void {
  setAttachmentsContext(value);
}

export function useAttachmentsContext(): AttachmentsContextValue {
  return getAttachmentsContext() ?? defaultAttachmentsContext;
}

export function provideAttachmentContext(value: AttachmentContextValue): void {
  setAttachmentContext(value);
}

export function useAttachmentContext(): AttachmentContextValue {
  const context = getAttachmentContext();
  if (!context) throw new Error('Attachment components must be used within <Attachment>');
  return context;
}

export function provideAttachmentHoverCardContext(value: AttachmentHoverCardContextValue): void {
  setAttachmentHoverCardContext(value);
}

export function useAttachmentHoverCardContext(): AttachmentHoverCardContextValue {
  const context = getAttachmentHoverCardContext();
  if (!context) throw new Error('Attachment hover card parts must be used within <AttachmentHoverCard>');
  return context;
}
