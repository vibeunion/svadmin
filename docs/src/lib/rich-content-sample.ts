import type { MarkdownRenderOptions } from '../../../packages/lite/src/rich-content';

/**
 * Shared rich-content sample for the demo route and its contract test.
 *
 * Keep every supported feature here (TOC, table, task list, footnote, fenced
 * code, inline emphasis, links) so the demo cannot drift away from the renderer
 * contract without a failing test.
 */
export const richContentSample = {
  notes: [
    '[toc]',
    '',
    '# Release notes',
    '',
    'The **inventory** sync shipped with three changes:',
    '',
    '## Migration',
    '',
    '- [x] Batched stock updates',
    '- [ ] Warehouse-level retry policy',
    '',
    '## Status matrix',
    '',
    '| Surface | Status | Owner |',
    '| :--- | :---: | ---: |',
    '| Stock list | ready | Ops |',
    '| Transfer form | ready | Ops |',
    '| Reconciliation | pending | Finance |',
    '',
    '## Loader',
    '',
    '```ts',
    "import { createListLoader } from '@svadmin/lite';",
    '',
    'export const load = createListLoader(dataProvider, products, {',
    '  pageSize: 25, // bounded read model',
    '});',
    '```',
    '',
    '## Impact',
    '',
    'Batching cut latency by 38%[^latency].',
    '',
    'Latency',
    ': Time from request to first byte.',

    'Read the [changelog](https://example.test/changelog) before rolling back.',
    '',
    '[^latency]: Measured against the previous weekly median.',
  ].join('\n'),

  insight: [
    '## What changed',
    '',
    'Renewal revenue is up **12%** while support load is flat.',
    '',
    '> Watch the two accounts flagged for onboarding risk.',
    '',
    '```json',
    '{ "renewals": 42, "churn": 3 }',
    '```',
  ].join('\n'),

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
};

/** Heading ids power the `[toc]` block and deep links into rendered content. */
export const richContentOptions: MarkdownRenderOptions = {
  headingIds: true,
  codeBlockClass: 'lite-code-block',
  tocLevels: 3,
};
