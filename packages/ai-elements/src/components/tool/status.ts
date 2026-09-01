import type { ToolState } from '../../contracts.js';

export type ToolDisplayState = ToolState;
export type ToolStatusTone = 'neutral' | 'pending' | 'info' | 'success' | 'warning' | 'danger';
export type ToolStatusIcon = 'circle' | 'clock' | 'check-circle' | 'x-circle';

export interface ToolStatusBadge {
  label: string;
  tone: ToolStatusTone;
  icon: ToolStatusIcon;
  pulse?: boolean;
}

const statuses: Record<ToolDisplayState, ToolStatusBadge> = {
  'approval-requested': { label: 'Awaiting Approval', tone: 'warning', icon: 'clock' },
  'approval-responded': { label: 'Responded', tone: 'info', icon: 'check-circle' },
  'input-available': { label: 'Running', tone: 'pending', icon: 'clock', pulse: true },
  'input-streaming': { label: 'Pending', tone: 'neutral', icon: 'circle' },
  'output-available': { label: 'Completed', tone: 'success', icon: 'check-circle' },
  'output-denied': { label: 'Denied', tone: 'warning', icon: 'x-circle' },
  'output-error': { label: 'Error', tone: 'danger', icon: 'x-circle' },
};

export function getStatusBadge(status: ToolDisplayState): ToolStatusBadge {
  return statuses[status];
}

export function formatToolValue(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}
