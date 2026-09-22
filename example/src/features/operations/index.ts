export { default as OperationsPage } from './OperationsPage.svelte';
export { default as OperationsWorkspacePage } from './OperationsWorkspacePage.svelte';
export { operationsResources } from './resources';

export const loadOperationsPage = () => import('./OperationsPage.svelte');
export const loadOperationsWorkspacePage = () => import('./OperationsWorkspacePage.svelte');
