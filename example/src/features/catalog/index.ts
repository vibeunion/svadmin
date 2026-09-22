export { default as ProductsPage } from './ProductsPage.svelte';
export { catalogResources } from './resources';

export const loadProductsPage = () => import('./ProductsPage.svelte');
