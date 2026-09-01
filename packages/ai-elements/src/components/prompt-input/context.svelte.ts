import { getContext, hasContext, setContext } from 'svelte';
import type { Snippet } from 'svelte';
import type { ChatAttachment, ChatSource } from '../../contracts.js';

export interface PromptInputFile extends ChatAttachment {
  filename?: string;
  /** 由输入组件创建并负责释放的本地预览 URL。 */
  previewUrlOwned?: boolean;
}

export interface PromptInputAttachmentsContext {
  readonly files: PromptInputFile[];
  add(files: File[] | FileList): PromptInputFile[];
  remove(id: string): void;
  clear(): void;
  openFileDialog(): void;
  readonly fileInputRef: HTMLInputElement | null;
}

export interface PromptInputTextContext {
  readonly value: string;
  setInput(value: string): void;
  clear(): void;
}

export interface PromptInputController {
  readonly textInput: PromptInputTextContext;
  readonly attachments: PromptInputAttachmentsContext;
  readonly syncHiddenInput?: boolean;
  registerFileInput(input: HTMLInputElement | null, open?: () => void): void;
}

export interface PromptInputReferencedSourcesContext {
  readonly sources: Array<ChatSource & { id: string }>;
  add(source: ChatSource | ChatSource[]): void;
  remove(id: string): void;
  clear(): void;
}

export interface PromptInputMenuContext {
  readonly open: boolean;
  setOpen(open: boolean): void;
}

export interface PromptInputSelectContext {
  readonly value: string;
  readonly open: boolean;
  setValue(value: string): void;
  setOpen(open: boolean): void;
}

export interface PromptInputHoverCardContext {
  readonly open: boolean;
  setOpen(open: boolean): void;
}

export interface PromptInputCommandItemRegistration {
  id: string;
  value: string;
  disabled: boolean;
  select(): void;
}

export interface PromptInputCommandContext {
  readonly query: string;
  readonly activeId?: string;
  readonly visibleCount: number;
  setQuery(query: string): void;
  register(item: PromptInputCommandItemRegistration): () => void;
  isVisible(value: string): boolean;
  move(step: 1 | -1): void;
  selectActive(): void;
}

export const PROMPT_INPUT_CONTROLLER = Symbol('svadmin.ai-elements.prompt-input.controller');
export const PROMPT_INPUT_PROVIDER_ATTACHMENTS = Symbol('svadmin.ai-elements.prompt-input.provider-attachments');
export const PROMPT_INPUT_REFERENCED_SOURCES = Symbol('svadmin.ai-elements.prompt-input.referenced-sources');
export const PROMPT_INPUT_MENU = Symbol('svadmin.ai-elements.prompt-input.menu');
export const PROMPT_INPUT_SELECT = Symbol('svadmin.ai-elements.prompt-input.select');
export const PROMPT_INPUT_HOVER_CARD = Symbol('svadmin.ai-elements.prompt-input.hover-card');
export const PROMPT_INPUT_COMMAND = Symbol('svadmin.ai-elements.prompt-input.command');

export function providePromptInputController(value: PromptInputController): void {
  setContext(PROMPT_INPUT_CONTROLLER, value);
}

export function getOptionalPromptInputController(): PromptInputController | undefined {
  return hasContext(PROMPT_INPUT_CONTROLLER)
    ? getContext<PromptInputController>(PROMPT_INPUT_CONTROLLER)
    : undefined;
}

export function usePromptInputController(): PromptInputController {
  const value = getOptionalPromptInputController();
  if (!value) throw new Error('PromptInput components must be used within PromptInput or PromptInputProvider');
  return value;
}

export function provideProviderAttachments(value: PromptInputAttachmentsContext): void {
  setContext(PROMPT_INPUT_PROVIDER_ATTACHMENTS, value);
}

export function useProviderAttachments(): PromptInputAttachmentsContext {
  const value = hasContext(PROMPT_INPUT_PROVIDER_ATTACHMENTS)
    ? getContext<PromptInputAttachmentsContext>(PROMPT_INPUT_PROVIDER_ATTACHMENTS)
    : undefined;
  if (!value) throw new Error('useProviderAttachments must be used within PromptInputProvider');
  return value;
}

export function usePromptInputAttachments(): PromptInputAttachmentsContext {
  return usePromptInputController().attachments;
}

export function providePromptInputReferences(value: PromptInputReferencedSourcesContext): void {
  setContext(PROMPT_INPUT_REFERENCED_SOURCES, value);
}

export function usePromptInputReferencedSources(): PromptInputReferencedSourcesContext {
  const value = hasContext(PROMPT_INPUT_REFERENCED_SOURCES)
    ? getContext<PromptInputReferencedSourcesContext>(PROMPT_INPUT_REFERENCED_SOURCES)
    : undefined;
  if (!value) throw new Error('PromptInput referenced-source components must be used within PromptInput');
  return value;
}

export function providePromptInputMenu(value: PromptInputMenuContext): void {
  setContext(PROMPT_INPUT_MENU, value);
}

export function usePromptInputMenu(): PromptInputMenuContext {
  const value = hasContext(PROMPT_INPUT_MENU) ? getContext<PromptInputMenuContext>(PROMPT_INPUT_MENU) : undefined;
  if (!value) throw new Error('PromptInputActionMenu components must be used within PromptInputActionMenu');
  return value;
}

export function providePromptInputSelect(value: PromptInputSelectContext): void {
  setContext(PROMPT_INPUT_SELECT, value);
}

export function usePromptInputSelect(): PromptInputSelectContext {
  const value = hasContext(PROMPT_INPUT_SELECT) ? getContext<PromptInputSelectContext>(PROMPT_INPUT_SELECT) : undefined;
  if (!value) throw new Error('PromptInputSelect components must be used within PromptInputSelect');
  return value;
}

export function providePromptInputHoverCard(value: PromptInputHoverCardContext): void {
  setContext(PROMPT_INPUT_HOVER_CARD, value);
}

export function usePromptInputHoverCard(): PromptInputHoverCardContext {
  const value = hasContext(PROMPT_INPUT_HOVER_CARD) ? getContext<PromptInputHoverCardContext>(PROMPT_INPUT_HOVER_CARD) : undefined;
  if (!value) throw new Error('PromptInputHoverCard components must be used within PromptInputHoverCard');
  return value;
}

export function providePromptInputCommand(value: PromptInputCommandContext): void {
  setContext(PROMPT_INPUT_COMMAND, value);
}

export function usePromptInputCommand(): PromptInputCommandContext {
  const value = hasContext(PROMPT_INPUT_COMMAND) ? getContext<PromptInputCommandContext>(PROMPT_INPUT_COMMAND) : undefined;
  if (!value) throw new Error('PromptInputCommand components must be used within PromptInputCommand');
  return value;
}

export type PromptInputChildren = Snippet;
