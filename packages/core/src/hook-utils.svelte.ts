import { definedOptions } from './defined-options';
// Hook Utilities — shared reactive helpers for all hooks
// Uses Svelte 5 runes ($state, $effect) for automatic lifecycle management

import { useQueryClient } from '@tanstack/svelte-query';
import { captureAdminContext } from './context.svelte';
import type { AdminContextAccessor } from './context.svelte';
import { createCheckedLiveSubscription, type LiveSubscriptionParams } from './live-subscription.svelte';
export type { LiveSubscriptionParams } from './live-subscription.svelte';
import { notifyWithProvider } from './notification.svelte';
import type { NotificationProvider } from './types';
import { handleAuthError } from './auth-hooks.svelte';
import { untrack } from 'svelte';

// ─── Auth Error Delegate ────────────────────────────────────────
// Delegate auth errors to authProvider.onError() — refine pattern

export async function checkError(
  error: unknown,
  adminContext: AdminContextAccessor=captureAdminContext(),
): Promise<void> {
  await untrack(() => handleAuthError(error,adminContext));
}

// ─── Overtime Tracker ───────────────────────────────────────────
// Tracks elapsed time during loading, auto-cleans via $effect

export interface OvertimeOptions {
  interval?: number; // ms, default 1000
  onInterval?: (elapsedTime: number) => void;
}

export interface OvertimeResult {
  readonly elapsedTime: number;
}

export function createOvertimeTracker(
  isLoadingFn: () => boolean,
  options: OvertimeOptions={},
): OvertimeResult {
  const { interval=1000,onInterval }=options;
  let elapsedTime=$state(0);

  $effect(() => {
    if(isLoadingFn()) {
      elapsedTime=0;
      const timer=setInterval(() => {
        elapsedTime+=interval;
        onInterval?.(elapsedTime);
      },interval);
      return () => clearInterval(timer);
    } else {
      elapsedTime=0;
    }
  });

  return {
    get elapsedTime() { return elapsedTime; },
  };
}

// ─── Live Subscription ──────────────────────────────────────────
// Auto-subscribes to realtime events, invalidates queries on 'auto' mode

export function createLiveSubscription(paramsFn: () => LiveSubscriptionParams): void {
  const queryClient=useQueryClient();
  createCheckedLiveSubscription(paramsFn,queryClient);
}

// ─── Notification Helpers ───────────────────────────────────────

export type NotificationConfig=
  |string
  |false
  |((data?: unknown,values?: unknown,resource?: string) => {
    message: string;
    description?: string;
    type?: 'success'|'error';
    key?: string;
  })
  |undefined;

export interface SuccessNotificationRequest {
  config: NotificationConfig;
  defaultMessage: string;
  data?: unknown;
  values?: unknown;
  resource?: string;
  provider?: NotificationProvider|null;
}

export interface ErrorNotificationRequest {
  config: NotificationConfig;
  defaultMessage: string;
  error?: unknown;
  resource?: string;
  provider?: NotificationProvider|null;
}

export function fireSuccessNotification(request: SuccessNotificationRequest): void {
  const { config,defaultMessage,data,values,resource,provider }=request;
  if(config===false) return;
  if(!config&&!defaultMessage) return;
  if(typeof config==='function') {
    const result=config(data,values,resource);
    notifyWithProvider({
      type: 'success',
      message: result.message,
      ...definedOptions({
        description: result.description,
        key: result.key,
      }),
    },provider);
    return;
  }
  notifyWithProvider({ type: 'success',message: config||defaultMessage },provider);
}

export function fireErrorNotification(request: ErrorNotificationRequest): void {
  const { config,defaultMessage,error,resource,provider }=request;
  if(config===false) return;
  if(!config&&!defaultMessage) return;
  if(typeof config==='function') {
    const result=config(error,undefined,resource);
    notifyWithProvider({
      type: 'error',
      message: result.message,
      ...definedOptions({
        description: result.description,
        key: result.key,
      }),
    },provider);
    return;
  }
  const errMsg=error instanceof Error? error.message:String(error??'');
  notifyWithProvider({ type: 'error',message: config||`${defaultMessage}${errMsg? ': '+errMsg:''}` },provider);
}
