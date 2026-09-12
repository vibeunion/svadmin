import { menu, resources } from '$lib/admin';
import type { LayoutServerLoad } from './$types';

export const load = (({ url }) => {
  const segments = url.pathname.split('/').filter(Boolean);
  // Example path: /lite -> '', /lite/products -> 'products', /lite/products/create -> 'products'
  const currentResource = segments[1] ?? '';

  return {
    // TypeBox contracts are non-POJO (symbols/functions) and cannot cross the
    // SSR serialization boundary; clients only need the plain definitions.
    resources: resources.map(({ contract: _contract, ...resource }) => resource),
    menu,
    currentResource,
  };
}) satisfies LayoutServerLoad;
