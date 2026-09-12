import { Type, type Static } from '@sinclair/typebox';
import { checkExact, snapshotPlainData } from '@svadmin/core/schema';
import type { DataProvider } from '@svadmin/core';

const postInput = Type.Object({
  title: Type.String({ minLength: 1 }),
  status: Type.Optional(Type.Union([Type.Literal('draft'), Type.Literal('published')])),
}, { additionalProperties: false });
const postUpdate = Type.Partial(postInput);
const postRecord = Type.Object({
  id: Type.Number(),
  title: postInput.properties.title,
  status: Type.Union([Type.Literal('draft'), Type.Literal('published')]),
}, { additionalProperties: false });
type PostRecord = Static<typeof postRecord>;

function copyPost(value: unknown): PostRecord {
  const post = snapshotPlainData(value);
  if (!checkExact(postRecord, post)) throw new Error('Invalid post record.');
  return post;
}

function postField(value: string): value is keyof PostRecord {
  return value === 'id' || value === 'title' || value === 'status';
}

export function createPostProvider(fallback: DataProvider): DataProvider {
  const posts: PostRecord[] = [
    { id: 1, title: 'IE11 SSR contract', status: 'published' },
    { id: 2, title: 'Native form actions', status: 'draft' },
    { id: 3, title: 'Dynamic catch-all routing', status: 'published' },
  ];
  let nextId = 4;
  return {
    getApiUrl: () => 'in-memory',
    async getList(params) {
      if (params.resource !== 'posts') return fallback.getList(params);
      let filtered = [...posts];
      for (const filter of params.filters ?? []) {
        if (!('field' in filter) || !postField(filter.field)) throw new Error('Invalid post filter.');
        const { field, value, operator } = filter;
        if (operator === 'contains' && typeof value === 'string') {
          filtered = filtered.filter(post => String(post[field]).toLowerCase().includes(value.trim().toLowerCase()));
        } else if (operator === 'eq' && (typeof value === 'string' || typeof value === 'number')) {
          filtered = filtered.filter(post => String(post[field]) === String(value));
        } else throw new Error('Invalid post filter.');
      }
      const sorter = params.sorters?.[0];
      if (sorter) {
        const { field, order } = sorter;
        if (!postField(field) || order !== 'asc' && order !== 'desc') throw new Error('Invalid post sorter.');
        filtered.sort((a, b) => {
          if (a[field] < b[field]) return order === 'asc' ? -1 : 1;
          if (a[field] > b[field]) return order === 'asc' ? 1 : -1;
          return 0;
        });
      }
      const current = params.pagination?.current ?? 1;
      const pageSize = params.pagination?.pageSize ?? 10;
      if (!Number.isSafeInteger(current) || current < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1) {
        throw new Error('Invalid post pagination.');
      }
      const start = (current - 1) * pageSize;
      return { data: filtered.slice(start, start + pageSize).map(copyPost), total: filtered.length };
    },
    async getOne(params) {
      if (params.resource !== 'posts') return fallback.getOne(params);
      const post = posts.find(row => String(row.id) === String(params.id));
      if (!post) throw new Error('Post not found.');
      return { data: copyPost(post) };
    },
    async create(params) {
      if (params.resource !== 'posts') return fallback.create(params);
      const variables = snapshotPlainData(params.variables);
      if (!checkExact(postInput, variables)) throw new Error('Invalid post input.');
      const post: PostRecord = { ...variables, status: variables.status ?? 'draft', id: nextId++ };
      posts.push(post);
      return { data: copyPost(post) };
    },
    async update(params) {
      if (params.resource !== 'posts') return fallback.update(params);
      const variables = snapshotPlainData(params.variables);
      if (!checkExact(postUpdate, variables)) throw new Error('Invalid post input.');
      const index = posts.findIndex(row => String(row.id) === String(params.id));
      const previous = posts[index];
      if (!previous) throw new Error('Post not found.');
      const post: PostRecord = { ...previous, ...variables };
      posts[index] = post;
      return { data: copyPost(post) };
    },
    async deleteOne(params) {
      if (params.resource !== 'posts') return fallback.deleteOne(params);
      if (params.variables !== undefined) throw new Error('Post deletion does not accept variables.');
      const index = posts.findIndex(row => String(row.id) === String(params.id));
      const post = posts[index];
      if (!post) throw new Error('Post not found.');
      posts.splice(index, 1);
      return { data: copyPost(post) };
    },
  };
}
