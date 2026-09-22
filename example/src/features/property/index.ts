export { default as PropertyOperationsPage } from './PropertyOperationsPage.svelte';
export { default as RealEstateWorkspacePage } from './RealEstateWorkspacePage.svelte';
export { propertyResources } from './resources';

export const loadPropertyOperationsPage = () => import('./PropertyOperationsPage.svelte');
export const loadRealEstateWorkspacePage = () => import('./RealEstateWorkspacePage.svelte');
