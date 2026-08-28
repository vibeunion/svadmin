import { dataProvider, postsResource, resources } from "$lib/admin";
import { createCrudActions, createListLoader } from "@svadmin/lite";
import type { Actions, PageServerLoad } from "./$types";

export const load = (async (event) => {
  const postsLoader = createListLoader(dataProvider, postsResource);
  const postsResult = await postsLoader(event);

  const [productsRes, usersRes, ordersRes, suppliersRes, warehousesRes] = await Promise.all([
    dataProvider.getList({ resource: "products", pagination: { current: 1, pageSize: 10 } }),
    dataProvider.getList({ resource: "users", pagination: { current: 1, pageSize: 10 } }),
    dataProvider.getList({ resource: "sales_orders", pagination: { current: 1, pageSize: 10 } }),
    dataProvider.getList({ resource: "suppliers", pagination: { current: 1, pageSize: 10 } }),
    dataProvider.getList({ resource: "warehouses", pagination: { current: 1, pageSize: 10 } }),
  ]);

  const orders = ordersRes.data as Array<Record<string, unknown>>;
  const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);

  return {
    ...postsResult,
    stats: {
      productsTotal: productsRes.total,
      usersTotal: usersRes.total,
      ordersTotal: ordersRes.total,
      suppliersTotal: suppliersRes.total,
      warehousesTotal: warehousesRes.total,
      totalRevenue,
      resourcesCount: resources.length,
    },
    recentOrders: orders.slice(0, 5),
    topProducts: (productsRes.data as Array<Record<string, unknown>>).slice(0, 4),
  };
}) satisfies PageServerLoad;

export const actions = {
  delete: (event) => createCrudActions(dataProvider, postsResource).delete(event),
} satisfies Actions;
