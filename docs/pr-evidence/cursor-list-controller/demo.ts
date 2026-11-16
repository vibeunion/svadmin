import { createCursorListController } from '../../../packages/core/src/cursor-list-controller';
import type { CursorPage } from '../../../packages/core/src/cursor-provider';

type Row = { id: string; title: string; status: string };
let failNext = false;
let hangNext = false;
const rows: Row[] = Array.from({ length: 7 }, (_, index) => ({
  id: String(index + 1), title: `Task ${index + 1}`, status: index < 5 ? 'open' : 'closed',
}));
const list = createCursorListController<{ status: string }, Row>({
  query: { status: 'open' }, queryKey: 'demo:open:2', scopeKey: 'tenant-a:tasks',
  provider: {
    async getList({ query, cursor }): Promise<CursorPage<Row>> {
      if (hangNext) { hangNext = false;return new Promise(() => {}); }
      await new Promise(resolve => setTimeout(resolve, 160));
      if (failNext) { failNext = false;throw Error('Fixture read failed'); }
      const filtered = rows.filter(row => query.status === 'all' || row.status === query.status);
      const offset = Number(cursor ?? 0);
      return { items: filtered.slice(offset, offset + 2), nextCursor: offset + 2 < filtered.length ? String(offset + 2) : null };
    },
  },
});
function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (!result) throw Error(`Missing demo element: ${selector}`);
  return result;
}
const previous = element<HTMLButtonElement>('#previous');
const next = element<HTMLButtonElement>('#next');
list.subscribe(state => {
  element('#rows').replaceChildren(...state.items.map(item => {
    const row = document.createElement('tr');
    for (const value of [item.id, item.title, item.status]) {
      const cell = document.createElement('td');cell.textContent = value;row.append(cell);
    }
    return row;
  }));
  element('#page').textContent = `Page ${state.page}`;
  element('#count').textContent = state.initialized ? `Current page: ${state.items.length} records` : 'Not loaded';
  element('#applied').textContent = `Applied: ${state.query.status}`;
  element('#scope').textContent = state.scopeKey;
  element('#failure').hidden = !state.error;
  element('#progress').textContent = state.loading ? 'Reading target page…' : '';
  previous.disabled = state.loading || !state.hasPrevious;
  next.disabled = state.loading || !state.hasNext;
  element<HTMLButtonElement>('#cancel').disabled = !state.loading;
  document.body.dataset['loading'] = String(state.loading);
});
previous.onclick = () => { void list.previous(); };
next.onclick = () => { void list.next(); };
element<HTMLButtonElement>('#fail').onclick = () => { failNext = true;void list.next(); };
element<HTMLButtonElement>('#fail-query').onclick = () => {
  failNext = true;void list.resetQuery({ status: 'closed' }, 'demo:closed:2');
};
element<HTMLButtonElement>('#retry').onclick = () => { void list.retry(); };
element<HTMLButtonElement>('#closed').onclick = () => { void list.setQuery({ status: 'closed' }, 'demo:closed:2'); };
element<HTMLButtonElement>('#open').onclick = () => { void list.setQuery({ status: 'open' }, 'demo:open:2'); };
element<HTMLButtonElement>('#clear').onclick = () => { void list.resetQuery({ status: 'all' }, 'demo:all:2'); };
element<HTMLButtonElement>('#query').onclick = () => { void list.resetQuery(list.state.query, list.state.queryKey); };
element<HTMLButtonElement>('#refresh').onclick = () => { void list.refresh(); };
element<HTMLButtonElement>('#hang').onclick = () => {
  hangNext = true;document.body.dataset['actionSettled'] = 'false';
  void list.next().then(result => { document.body.dataset['actionSettled'] = String(!result); });
};
element<HTMLButtonElement>('#cancel').onclick = () => list.cancel();
element<HTMLButtonElement>('#scope-change').onclick = () => {
  failNext = true;void list.setQuery(list.state.query, list.state.queryKey, 'tenant-b:tasks');
};
void list.refresh();
