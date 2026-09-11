// Example resource definitions — generic demo data (JSONPlaceholder-style)

import type { ResourceDefinition } from '@svadmin/core';
import { posts, users, comments, todos } from './resource-contracts';

export const resources: ResourceDefinition[] = [
  {
    name: 'posts',
    contract: posts,
    label: 'Posts',
    icon: 'file-text',
    fields: [
      { key: 'id', label: 'ID', type: 'number', showInForm: false, width: '60px' },
      { key: 'title', label: 'Title', type: 'text', required: true, searchable: true },
      { key: 'body', label: 'Body', type: 'textarea', showInList: false },
      { key: 'userId', label: 'Author', type: 'number', width: '80px' },
    ],
    defaultSort: { field: 'id', order: 'desc' },
  },

  {
    name: 'users',
    contract: users,
    label: 'Users',
    icon: 'users',
    canCreate: false,
    canDelete: false,
    fields: [
      { key: 'id', label: 'ID', type: 'number', showInForm: false, width: '60px' },
      { key: 'name', label: 'Name', type: 'text', searchable: true },
      { key: 'username', label: 'Username', type: 'text', width: '120px' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'phone', showInList: false },
      { key: 'website', label: 'Website', type: 'url', showInList: false },
    ],
  },

  {
    name: 'comments',
    contract: comments,
    label: 'Comments',
    icon: 'message-circle',
    fields: [
      { key: 'id', label: 'ID', type: 'number', showInForm: false, width: '60px' },
      { key: 'postId', label: 'Post', type: 'number', width: '80px' },
      { key: 'name', label: 'Title', type: 'text', searchable: true },
      { key: 'email', label: 'Email', type: 'email', width: '180px' },
      { key: 'body', label: 'Body', type: 'textarea', showInList: false },
    ],
    defaultSort: { field: 'id', order: 'desc' },
  },

  {
    name: 'todos',
    contract: todos,
    label: 'Todos',
    icon: 'check-square',
    fields: [
      { key: 'id', label: 'ID', type: 'number', showInForm: false, width: '60px' },
      { key: 'title', label: 'Title', type: 'text', required: true, searchable: true },
      { key: 'completed', label: 'Done', type: 'boolean', width: '80px' },
      { key: 'userId', label: 'User', type: 'number', width: '80px' },
    ],
  },
];
