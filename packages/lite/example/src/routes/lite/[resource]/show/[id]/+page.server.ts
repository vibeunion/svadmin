import { error } from '@sveltejs/kit';
import { createDetailLoader } from '@svadmin/lite';
import { dataProvider, getResource } from '$lib/admin';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
  const resource = getResource(event.params.resource);
  if (!resource) {
    throw error(404, `Resource "${event.params.resource}" not found`);
  }
  return createDetailLoader(dataProvider, resource)(event);
}) satisfies PageServerLoad;
