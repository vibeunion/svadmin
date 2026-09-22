export { default as DomainWorkspacePage } from './DomainWorkspacePage.svelte';
export { default as InventoryDirectoryPage } from './InventoryDirectoryPage.svelte';
export { domainResources } from './resources';

export const loadDomainWorkspacePage = () => import('./DomainWorkspacePage.svelte');
export const loadInventoryDirectoryPage = () => import('./InventoryDirectoryPage.svelte');
