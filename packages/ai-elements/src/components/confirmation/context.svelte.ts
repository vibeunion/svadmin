import { createContext } from 'svelte';
import type { ToolState } from '../../contracts.js';

export type ConfirmationStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type ConfirmationState = ToolState;

export interface ConfirmationApproval {
  id?: string;
  approved?: boolean;
  reason?: string;
}

export interface ConfirmationContextValue {
  readonly approval: ConfirmationApproval | undefined;
  readonly state: ConfirmationState;
  readonly status: ConfirmationStatus;
}

const [getConfirmationContext, setConfirmationContext] = createContext<ConfirmationContextValue>();

export function provideConfirmationContext(context: ConfirmationContextValue): ConfirmationContextValue {
  setConfirmationContext(context);
  return context;
}

export function useConfirmationContext(component = 'Confirmation component'): ConfirmationContextValue {
  try {
    return getConfirmationContext();
  } catch {
    throw new Error(`${component} must be used within Confirmation`);
  }
}

export function isConfirmationRequestState(state: ConfirmationState): boolean {
  return state === 'approval-requested';
}

export function isConfirmationResponseState(state: ConfirmationState): boolean {
  return state === 'approval-responded'
    || state === 'output-denied'
    || state === 'output-available';
}
