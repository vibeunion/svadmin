import { menu, resources } from '$lib/admin';
import type { LayoutServerLoad } from './$types';

export const load = (({ url }) => {
  const segments = url.pathname.split('/').filter(Boolean);
  // Example path: /lite -> '', /lite/products -> 'products', /lite/products/create -> 'products'
  const currentResource = segments[1] ?? '';

  return {
    resources,
    menu,
    currentResource,
  };
}) satisfies LayoutServerLoad;
