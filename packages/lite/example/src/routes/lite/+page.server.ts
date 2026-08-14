import type { Actions, PageServerLoad } from './$types';

interface PostRecord extends Record<string, unknown> {
  id: number;
  title: string;
  status: 'draft' | 'published';
}

let posts: PostRecord[] = [
  { id: 1, title: 'IE11 SSR contract', status: 'published' },
  { id: 2, title: 'Native form actions', status: 'draft' },
];

export const load = (({ url }) => {
  const searchTerm = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
  const visiblePosts = searchTerm
    ? posts.filter((post) => post.title.toLowerCase().includes(searchTerm))
    : posts;

  return { posts: visiblePosts, searchTerm };
}) satisfies PageServerLoad;

export const actions = {
  delete: async ({ request }) => {
    const submittedId = Number((await request.formData()).get('id'));
    if (!Number.isSafeInteger(submittedId)) {
      return { success: false, error: 'A valid post id is required' };
    }

    posts = posts.filter((post) => post.id !== submittedId);
    return { success: true };
  },
} satisfies Actions;
