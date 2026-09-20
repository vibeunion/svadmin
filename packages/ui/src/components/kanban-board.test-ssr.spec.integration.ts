import { render } from 'svelte/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setLocale } from '@svadmin/core/i18n';
import KanbanBoard from './KanbanBoard.svelte';
import LiteKanbanBoard from '../../../lite/src/components/LiteKanbanBoard.svelte';

const columns = [{ id: 'todo', title: 'To do' }];
const card = { id: 'one', title: 'First', columnId: 'todo' };
beforeEach(() => setLocale('en'));

describe.each([['SPA', KanbanBoard], ['Lite', LiteKanbanBoard]] as const)('%s Kanban SSR', (_name, Component) => {
  it('renders read-only cards without a browser runtime', () => {
    const { body } = render(Component, { props: { columns, cards: [card] } });
    expect(body).toContain('aria-label="First"');
    expect(body).not.toContain('<script');
  });
  it('refuses invalid identifiers before rendering keyed cards', () => {
    const { body } = render(Component, { props: { columns, cards: [card, card] } });
    expect(body).toContain('role="alert"');
    expect(body).not.toContain('aria-label="First"');
  });
});

it('Lite SSR renders a native create form without move callbacks', () => {
  const { body } = render(LiteKanbanBoard, { props: { columns, cards: [card], formAction: '?/add' } });
  expect(body).toContain('method="POST"');
  expect(body).toContain('action="?/add"');
  expect(body).toContain('name="columnId" value="todo"');
  expect(body).toContain('name="title"');
  expect(body).not.toContain('ondrop');
});
