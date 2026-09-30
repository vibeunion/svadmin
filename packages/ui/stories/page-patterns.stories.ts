import PagePatternExample from './PagePatternExample.svelte';

export default {
  title: 'Page Patterns / Business Pages',
  component: PagePatternExample,
  parameters: { layout: 'fullscreen' },
};

export const List = { args: { kind: 'list' } };
export const Form = { args: { kind: 'form' } };
export const Detail = { args: { kind: 'detail' } };
export const Workspace = { args: { kind: 'workspace' } };
export const Dashboard = { args: { kind: 'dashboard' } };
export const Empty = { args: { kind: 'list', viewState: 'empty' } };
export const Loading = { args: { kind: 'list', viewState: 'loading' } };
export const Error = { args: { kind: 'list', viewState: 'error' } };
export const Forbidden = { args: { kind: 'list', viewState: 'forbidden' } };
