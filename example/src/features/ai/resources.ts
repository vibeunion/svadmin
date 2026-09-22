import type { StrictResourceDefinition } from '../resource-types';

export const aiResources = [
  {
      name: 'ai_conversations',
      label: 'AI Chat',
      icon: 'bot',
      group: 'Intelligence',
      menuOrder: 130,
      fields: [
        { key: 'id', label: 'ID', type: 'number', showInForm: false, width: '72px' },
        { key: 'title', label: 'Title', type: 'text', required: true, searchable: true },
        {
          key: 'intent',
          label: 'Intent',
          type: 'select',
          required: true,
          options: [
            { label: 'Replenishment', value: 'replenishment' },
            { label: 'Forecast', value: 'forecast' },
            { label: 'Exception Review', value: 'exception_review' },
            { label: 'Policy Help', value: 'policy_help' },
          ],
        },
        { key: 'ownerId', label: 'Owner', type: 'relation', resource: 'users', optionLabel: 'name', optionValue: 'id' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          options: [
            { label: 'Open', value: 'open' },
            { label: 'Waiting', value: 'waiting' },
            { label: 'Resolved', value: 'resolved' },
          ],
        },
        { key: 'lastMessage', label: 'Last Message', type: 'textarea' },
        { key: 'updatedAt', label: 'Updated', type: 'date' },
      ],
      defaultSort: { field: 'updatedAt', order: 'desc' },
    },
] satisfies StrictResourceDefinition<'ai_conversations'>[];
