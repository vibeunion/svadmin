import { error } from '@sveltejs/kit';
import { createCrudActions, createListLoader } from '@svadmin/lite';
import { dataProvider, getResource } from '$lib/admin';
import type { Actions, PageServerLoad } from './$types';

export const load = ((event) => {
  const resource = getResource(event.params.resource);
  if (!resource) {
    throw error(404, `Resource "${event.params.resource}" not found`);
  }
  return createListLoader(dataProvider, resource)(event);
}) satisfies PageServerLoad;

export const actions = {
  delete: async (event) => {
    const resource = getResource(event.params.resource);
    if (!resource) {
      throw error(404, `Resource "${event.params.resource}" not found`);
    }
    return createCrudActions(dataProvider, resource).delete(event);
  },
  batchDelete: async (event) => {
    const resource = getResource(event.params.resource);
    if (!resource) {
      throw error(404, `Resource "${event.params.resource}" not found`);
    }
    return createCrudActions(dataProvider, resource).batchDelete(event);
  },
} satisfies Actions;
