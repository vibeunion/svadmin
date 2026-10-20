import AppShellPageExample from './AppShellPageExample.svelte';

export default {
  title: 'Layout / App Shell',
  component: AppShellPageExample,
  parameters: { layout: 'fullscreen' },
};

export const Default = { args: {} };
export const Wide = { args: { width: 'wide' } };
export const Narrow = { args: { width: 'narrow' } };
export const CollapsedRail = { args: { collapsed: true } };