export { default as UserManagementPage } from './UserManagementPage.svelte';
export { peopleResources } from './resources';

export const loadUserManagementPage = () => import('./UserManagementPage.svelte');
