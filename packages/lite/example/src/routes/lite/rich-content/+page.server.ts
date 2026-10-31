import type { PageServerLoad } from './$types';

const notes = [
  '# Release notes',
  '',
  'The **inventory** sync shipped with three changes:',
  '',
  '- [x] Batched stock updates',
  '- [ ] Warehouse-level retry policy',
  '',
  '| Surface | Status | Owner |',
  '| :--- | :---: | ---: |',
  '| Stock list | ready | Ops |',
  '| Transfer form | ready | Ops |',
  '| Reconciliation | pending | Finance |',
  '',
  '```ts',
  "import { createListLoader } from '@svadmin/lite';",
  '',
  'export const load = createListLoader(dataProvider, products, {',
  '  pageSize: 25, // bounded read model',
  '});',
  '```',
  '',
  'Batching cut latency by 38%[^latency].',
  '',
  '[^latency]: Measured against the previous weekly median.',
].join('\n');

const insight = [
  '## What changed',
  '',
  'Renewal revenue is up **12%** while support load is flat.',
  '',
  '> Watch the two accounts flagged for onboarding risk.',
  '',
  '```json',
  '{ "renewals": 42, "churn": 3 }',
  '```',
].join('\n');

export const load = (() => ({
  notes,
  insight,
  comments: [
    {
      id: 'c1',
      author: 'Ada',
      time: '09:12',
      content: 'Batching looks good — see the `pageSize` note.\n\n- retries left',
      replies: [{ id: 'r1', author: 'Lin', content: '*Agreed*, ship it.' }],
    },
  ],
  notifications: [
    {
      id: 'n1',
      title: 'Sync finished',
      description: '**248** rows updated · [review](/lite/stock_movements)',
      time: '09:20',
    },
  ],
})) satisfies PageServerLoad;