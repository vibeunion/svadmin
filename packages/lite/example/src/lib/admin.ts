import type { ResourceDefinition } from '@svadmin/core';

export const postsResource = {
  name: 'posts',
  label: 'Posts',
  canCreate: false,
  fields: [
    { key: 'id', label: 'ID', type: 'number', sortable: false },
    { key: 'title', label: 'Title', type: 'text', searchable: true },
    { key: 'status', label: 'Status', type: 'select', options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Published', value: 'published' },
    ] },
  ],
} satisfies ResourceDefinition;
