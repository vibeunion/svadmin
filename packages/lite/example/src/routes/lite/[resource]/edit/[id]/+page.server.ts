import { error, redirect } from '@sveltejs/kit';
import { createCrudActions, createDetailLoader } from '@svadmin/lite';
import { dataProvider, getResource } from '$lib/admin';
import type { Actions, PageServerLoad } from './$types';

export const load = (async (event) => {
  const resource = getResource(event.params.resource);
  if (!resource) {
    throw error(404, `Resource "${event.params.resource}" not found`);
  }
  return createDetailLoader(dataProvider, resource)(event);
}) satisfies PageServerLoad;

export const actions = {
  update: async (event) => {
    const resource = getResource(event.params.resource);
    if (!resource) {
      throw error(404, `Resource "${event.params.resource}" not found`);
    }
    const result = await createCrudActions(dataProvider, resource).update(event);
    if (result && 'success' in result && result.success) {
      throw redirect(303, `/lite/${resource.name}/show/${event.params.id}`);
    }
    return result;
  },
  delete: async (event) => {
    const resource = getResource(event.params.resource);
    if (!resource) {
      throw error(404, `Resource "${event.params.resource}" not found`);
    }
    return createCrudActions(dataProvider, resource).delete(event);
  },
} satisfies Actions;
