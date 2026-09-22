export { default as CrmDashboardPage } from './CrmDashboardPage.svelte';
export { default as CrmOperationsPage } from './CrmOperationsPage.svelte';
export { crmResources } from './resources';

export const loadCrmDashboardPage = () => import('./CrmDashboardPage.svelte');
export const loadCrmOperationsPage = () => import('./CrmOperationsPage.svelte');
