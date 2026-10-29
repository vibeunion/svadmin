/**
 * Refine NotificationProvider → svadmin NotificationProvider.
 *
 * Refine allows extra fields such as `undoable`; svadmin keeps the checked
 * message envelope and ignores provider-specific extras.
 */
import type { NotificationProvider } from '@svadmin/core';

type RefineNotificationSource = {
  open?: (params: { type: string; message: string; description?: string; key?: string }) => unknown;
  close?: (key: string) => unknown;
};

const types = new Set(['success', 'error', 'warning', 'info']);

export function createRefineNotificationAdapter(source: unknown): NotificationProvider {
  if (typeof source !== 'object' || source === null ||
    typeof (source as RefineNotificationSource).open !== 'function' ||
    typeof (source as RefineNotificationSource).close !== 'function') {
    throw new TypeError('createRefineNotificationAdapter: expected open() and close()');
  }
  const input = source as Required<RefineNotificationSource>;
  return {
    open: (params) => {
      if (!types.has(params.type)) throw new TypeError('Invalid notification type');
      input.open.call(source, params);
    },
    close: (key) => { input.close.call(source, key); },
  };
}