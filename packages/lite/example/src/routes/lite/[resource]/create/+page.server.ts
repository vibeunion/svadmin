import { error, redirect } from '@sveltejs/kit';
import { createCrudActions } from '@svadmin/lite';
import { dataProvider, getResource } from '$lib/admin';
import type { Actions, PageServerLoad } from './$types';

export const load = (({ params }) => {
  const resource = getResource(params.resource);
  if (!resource) {
    throw error(404, `Resource "${params.resource}" not found`);
  }
  return { resource };
}) satisfies PageServerLoad;

export const actions = {
  create: async (event) => {
    const resource = getResource(event.params.resource);
    if (!resource) {
      throw error(404, `Resource "${event.params.resource}" not found`);
    }
    const result = await createCrudActions(dataProvider, resource).create(event);
    if (result && 'success' in result && result.success) {
      throw redirect(303, `/lite/${resource.name}`);
    }
    return result;
  },
} satisfies Actions;
