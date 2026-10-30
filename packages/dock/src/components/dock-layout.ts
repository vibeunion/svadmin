import type { Component } from 'svelte';

export type DockPanelPosition = 'left' | 'right' | 'above' | 'below' | 'within';

export interface DockPanel {
  id: string;
  title: string;
  component: Component<Record<string, unknown>>;
  props?: Record<string, unknown>;
  referencePanel?: string;
  direction?: DockPanelPosition;
}
