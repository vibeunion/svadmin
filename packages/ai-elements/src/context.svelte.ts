import { createContext } from 'svelte';
import type { Snippet } from 'svelte';
import type { ChatMessage } from './contracts.js';

export interface ConversationContext {
  readonly messages: ChatMessage[];
  readonly isStreaming: boolean;
  readonly isAtBottom: boolean;
  scrollToBottom(): void;
  registerContent(element: HTMLElement | null): void;
}

const [getConversationContext, setConversationContext] = createContext<ConversationContext>();

export function provideConversationContext(context: ConversationContext): ConversationContext {
  setConversationContext(context);
  return context;
}

export function useConversationContext(): ConversationContext {
  return getConversationContext();
}

export type RenderChildren = Snippet;
