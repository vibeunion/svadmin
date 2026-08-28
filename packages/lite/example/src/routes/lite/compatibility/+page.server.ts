import type { Actions } from './$types';

export const actions = {
  compute: async () => ({ success: true, engine: 'server' }),
  move: async () => ({ success: true }),
  upload: async ({ request }) => {
    const formData = await request.formData();
    const uploadedFiles = formData.getAll('directoryFiles')
      .concat(formData.getAll('directoryArchive'))
      .filter((value) => value instanceof File && value.size > 0).length;
    return { success: true, uploadedFiles };
  },
} satisfies Actions;
