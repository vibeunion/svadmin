import type { StrictResourceDefinition } from '../resource-types';

export const calendarResources = [
  {
      name: 'calendar_events',
      label: 'Calendar',
      icon: 'calendar',
      group: 'Planning',
      menuOrder: 120,
      fields: [
        { key: 'id', label: 'ID', type: 'number', showInForm: false, width: '72px' },
        { key: 'title', label: 'Title', type: 'text', required: true, searchable: true },
        {
          key: 'type',
          label: 'Type',
          type: 'select',
          required: true,
          options: [
            { label: 'Purchase', value: 'purchase' },
            { label: 'Cycle Count', value: 'cycle_count' },
            { label: 'Receiving', value: 'receiving' },
            { label: 'Review', value: 'review' },
          ],
        },
        { key: 'startDate', label: 'Start Date', type: 'date', required: true },
        { key: 'endDate', label: 'End Date', type: 'date' },
        { key: 'ownerId', label: 'Owner', type: 'relation', resource: 'users', optionLabel: 'name', optionValue: 'id' },
        { key: 'warehouseId', label: 'Warehouse', type: 'relation', resource: 'warehouses', optionLabel: 'name', optionValue: 'id' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          options: [
            { label: 'Scheduled', value: 'scheduled' },
            { label: 'In Progress', value: 'in_progress' },
            { label: 'Done', value: 'done' },
          ],
        },
        { key: 'notes', label: 'Notes', type: 'textarea', showInList: false },
      ],
      defaultSort: { field: 'startDate', order: 'asc' },
    },
] satisfies StrictResourceDefinition<'calendar_events'>[];
