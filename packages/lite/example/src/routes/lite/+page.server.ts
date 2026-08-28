import { dataProvider, postsResource, resources } from '$lib/admin';
import { createCrudActions, createListLoader } from '@svadmin/lite';
import type { Actions, PageServerLoad } from './$types';

export const load = (async (event) => {
  const postsLoader = createListLoader(dataProvider, postsResource);
  const postsResult = await postsLoader(event);

  const [productsRes, usersRes, ordersRes] = await Promise.all([
    dataProvider.getList({ resource: 'products', pagination: { current: 1, pageSize: 1 } }),
    dataProvider.getList({ resource: 'users', pagination: { current: 1, pageSize: 1 } }),
    dataProvider.getList({ resource: 'sales_orders', pagination: { current: 1, pageSize: 1 } }),
  ]);

  return {
    ...postsResult,
    stats: {
      productsTotal: productsRes.total,
      usersTotal: usersRes.total,
      ordersTotal: ordersRes.total,
      resourcesCount: resources.length,
    },
  };
}) satisfies PageServerLoad;

export const actions = {
  delete: (event) => createCrudActions(dataProvider, postsResource).delete(event),
} satisfies Actions;
