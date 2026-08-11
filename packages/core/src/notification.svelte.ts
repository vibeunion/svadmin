// Notification Provider — pluggable notification system
// Falls back to built-in toast when no provider is set

import { toast } from './toast.svelte';
import type { NotificationProvider } from './types';

let notificationProvider = $state<NotificationProvider | null>(null);

export function setNotificationProvider(provider: NotificationProvider): void {
  notificationProvider = provider;
}

export function getNotificationProvider(): NotificationProvider | null {
  return notificationProvider;
}

/**
 * Send a notification through the configured provider, or fall back to toast.
 */
export interface NotificationParams {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  description?: string;
  key?: string;
}

/** Send through an explicitly scoped provider, with the built-in toast as fallback. */
export function notifyWithProvider(
  params: NotificationParams,
  provider: NotificationProvider | null | undefined,
): void {
  if (provider) {
    provider.open(params);
  } else {
    const { type, message, description } = params;
    const fullMessage = description ? `${message}: ${description}` : message;
    switch (type) {
      case 'success': toast.success(fullMessage, undefined, { key: params.key }); break;
      case 'error': toast.error(fullMessage, undefined, { key: params.key }); break;
      case 'warning': toast.warning(fullMessage, undefined, { key: params.key }); break;
      case 'info': toast.info(fullMessage, undefined, { key: params.key }); break;
    }
  }
}

export function notify(params: NotificationParams): void {
  notifyWithProvider(params, notificationProvider);
}

/**
 * Close a notification by key (only works with custom provider).
 */
export function closeNotification(key: string): void {
  notificationProvider?.close(key);
}

export function resetNotificationProvider(): void {
  notificationProvider = null;
}
