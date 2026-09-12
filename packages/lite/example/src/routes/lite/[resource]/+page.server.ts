import { error } from '@sveltejs/kit';
import { createCrudActions, createListLoader } from '@svadmin/lite';
import { dataProvider, getResource, plainDefinition } from '$lib/admin';
import type { Actions, PageServerLoad } from './$types';

export const load = (async (event) => {
  const resource = getResource(event.params.resource);
  if (!resource) {
    throw error(404, `Resource "${event.params.resource}" not found`);
  }
  const result = await createListLoader(dataProvider, resource)(event);
  return { ...result, resource: plainDefinition(result.resource) };
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
