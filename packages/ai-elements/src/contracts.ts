export type {
  AdminTool,
  AgentEvent,
  AgentProvider,
  ApprovalResponseOptions,
  ChatAttachment,
  ChatContext,
  ChatMessage,
  ChatMessagePart,
  ChatProvider,
  ChatSource,
  MessageStatus,
  ToolResult,
  ToolState,
} from '@svadmin/core';

import type { ChatMessage, ChatMessagePart, ChatProvider } from '@svadmin/core';

export type ChatProviderResponse = ReturnType<ChatProvider['sendMessage']>;
export type ChatProviderStream = AsyncGenerator<ChatMessagePart | string, void, unknown>;

export function textPart(text: string): ChatMessagePart {
  return { type: 'text', text };
}

export function messageText(message: Pick<ChatMessage, 'parts'>): string {
  return message.parts.filter((part): part is Extract<ChatMessagePart, { type: 'text' }> => part.type === 'text').map((part) => part.text).join('');
}

export function normalizeMessagePart(part: ChatMessagePart | string): ChatMessagePart {
  return typeof part === 'string' ? textPart(part) : part;
}

export function normalizeMessageParts(parts: ChatMessagePart[] | string): ChatMessagePart[] {
  return typeof parts === 'string' ? [textPart(parts)] : parts.map(normalizeMessagePart);
}

export function partsToText(parts: ChatMessagePart[]): string {
  return parts.filter((part): part is Extract<ChatMessagePart, { type: 'text' }> => part.type === 'text').map((part) => part.text).join('');
}

export function isChatProviderStream(response: ChatProviderResponse): response is ChatProviderStream {
  return typeof Reflect.get(Object(response), Symbol.asyncIterator) === 'function';
}

export interface ConsumeTextResponseOptions {
  /** Provider 请求取消后停止应用后续分片。 */
  signal?: AbortSignal;
  /** 组件作用域或输入值变化时，用额外身份检查拒绝过期结果。 */
  isCurrent?: () => boolean;
}

export async function consumeTextResponse(
  response: ChatProviderResponse,
  onText?: (text: string) => void,
  options: ConsumeTextResponseOptions = {},
): Promise<string> {
  const isActive = (): boolean => !options.signal?.aborted && (options.isCurrent?.() ?? true);
  if (!isActive()) return '';

  if (!isChatProviderStream(response)) {
    const resolved = await response;
    if (!isActive()) return '';
    const text = typeof resolved === 'string' ? resolved : partsToText(resolved);
    onText?.(text);
    return text;
  }

  let text = '';
  for await (const chunk of response) {
    if (!isActive()) break;
    const nextText = typeof chunk === 'string' ? chunk : chunk.type === 'text' ? chunk.text : '';
    if (!nextText) continue;
    text += nextText;
    onText?.(text);
  }
  return text;
}

export function createMessage(role: ChatMessage['role'], parts: ChatMessagePart[] | string, id: string): ChatMessage {
  return { id, role, parts: normalizeMessageParts(parts), status: 'complete', createdAt: Date.now() };
}
