import type { ChatAttachment } from '../../contracts.js';
import type { PromptInputFile } from './context.svelte.js';

function createFileId(file: File, usedIds: Set<string>): string {
  const base = `${file.name}-${file.size}-${file.lastModified}`;
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) id = `${base}-${suffix++}`;
  usedIds.add(id);
  return id;
}

export function createPromptInputFiles(
  incoming: readonly File[],
  existing: readonly PromptInputFile[] = [],
): PromptInputFile[] {
  const usedIds = new Set(existing.map((file) => file.id));
  return incoming.map((file) => {
    const url = typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function'
      ? undefined
      : URL.createObjectURL(file);
    return {
      id: createFileId(file, usedIds),
      name: file.name,
      filename: file.name,
      mediaType: file.type || undefined,
      size: file.size,
      url,
      previewUrlOwned: Boolean(url),
      file,
    };
  });
}

export function revokePromptInputFile(file: PromptInputFile): void {
  if (
    file.previewUrlOwned
    && file.url?.startsWith('blob:')
    && typeof URL !== 'undefined'
    && typeof URL.revokeObjectURL === 'function'
  ) {
    URL.revokeObjectURL(file.url);
  }
}

export function toChatAttachment(file: PromptInputFile): ChatAttachment {
  const { filename: _filename, previewUrlOwned: _previewUrlOwned, ...attachment } = file;
  return attachment;
}

export function toSubmittedAttachment(file: PromptInputFile): ChatAttachment {
  const attachment = toChatAttachment(file);
  if (!file.previewUrlOwned || !attachment.url?.startsWith('blob:')) return attachment;

  // Preview URLs belong to the input lifecycle; the File remains usable by the submitter.
  const { url: _previewUrl, ...submitted } = attachment;
  return submitted;
}
