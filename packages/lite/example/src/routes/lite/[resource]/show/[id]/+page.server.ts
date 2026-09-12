import { error } from '@sveltejs/kit';
import { createDetailLoader } from '@svadmin/lite';
import { dataProvider, getResource, plainDefinition } from '$lib/admin';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
  const resource = getResource(event.params.resource);
  if (!resource) {
    throw error(404, `Resource "${event.params.resource}" not found`);
  }
  const result = await createDetailLoader(dataProvider, resource)(event);
  return { ...result, resource: plainDefinition(result.resource) };
}) satisfies PageServerLoad;
