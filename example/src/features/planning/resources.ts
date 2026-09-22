import type { StrictResourceDefinition } from '../resource-types';

export const planningResources = [
  {
      name: 'todos',
      label: 'Todo',
      icon: 'list-todo',
      group: 'Operations',
      menuOrder: 120,
      fields: [
        { key: 'id', label: 'ID', type: 'number', showInForm: false, width: '72px' },
        { key: 'title', label: 'Title', type: 'text', required: true, searchable: true },
        { key: 'assigneeId', label: 'Assignee', type: 'relation', resource: 'users', optionLabel: 'name', optionValue: 'id' },
        { key: 'dueDate', label: 'Due Date', type: 'date' },
        {
          key: 'priority',
          label: 'Priority',
          type: 'select',
          options: [
            { label: 'High', value: 'high' },
            { label: 'Medium', value: 'medium' },
            { label: 'Low', value: 'low' },
          ],
        },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { label: 'Open', value: 'open' },
            { label: 'In Progress', value: 'in_progress' },
            { label: 'Blocked', value: 'blocked' },
            { label: 'Done', value: 'done' },
          ],
        },
        { key: 'completed', label: 'Done', type: 'boolean', width: '90px' },
        { key: 'notes', label: 'Notes', type: 'textarea', showInList: false },
      ],
      defaultSort: { field: 'dueDate', order: 'asc' },
    },
] satisfies StrictResourceDefinition<'todos'>[];
