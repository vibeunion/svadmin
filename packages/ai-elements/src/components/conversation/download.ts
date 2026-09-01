import type { ChatMessage } from '../../contracts.js';
import { messageText } from '../../contracts.js';

export type ConversationMessageFormatter = (message: ChatMessage, index: number) => string;

export const defaultFormatMessage: ConversationMessageFormatter = (message) => {
  const roleLabel = message.role.charAt(0).toUpperCase() + message.role.slice(1);
  return `**${roleLabel}:** ${messageText(message)}`;
};

export function messagesToMarkdown(
  messages: ChatMessage[],
  formatMessage: ConversationMessageFormatter = defaultFormatMessage,
): string {
  return messages.map((message, index) => formatMessage(message, index)).join('\n\n');
}
