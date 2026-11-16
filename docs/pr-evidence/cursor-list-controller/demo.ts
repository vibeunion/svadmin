import { createCursorListController } from '../../../packages/core/src/cursor-list-controller';
let failNext = false;
const rows = Array.from({ length: 7 }, (_, index) => ({ id: String(index + 1), title: `Task ${index + 1}`, status: index < 5 ? 'open' : 'closed' }));
const list = createCursorListController({ query: { status: 'open' }, queryKey: 'demo:open:2', provider: {
  async getList({ query, cursor }) {
    await new Promise(resolve => setTimeout(resolve, 160));
    if (failNext) { failNext = false;throw Error('Fixture read failed'); }
    const filtered = rows.filter(row => row.status === query.status),offset = Number(cursor ?? 0);
    return { items: filtered.slice(offset, offset + 2), nextCursor: offset + 2 < filtered.length ? String(offset + 2) : null };
  },
} });
const previous = document.querySelector<HTMLButtonElement>('#previous')!,next = document.querySelector<HTMLButtonElement>('#next')!;
list.subscribe(state => {
  document.querySelector('#rows')!.replaceChildren(...state.items.map(item => { const row = document.createElement('tr');for (const value of [item.id,item.title,item.status]) { const cell = document.createElement('td');cell.textContent = value;row.append(cell); }return row; }));
  document.querySelector('#page')!.textContent = `Page ${state.page}`;
  document.querySelector('#count')!.textContent = state.initialized ? `Current page: ${state.items.length} records` : 'Not loaded';
  document.querySelector('#applied')!.textContent = `Applied: ${state.query.status}`;
  document.querySelector<HTMLElement>('#failure')!.hidden = !state.error;
  document.querySelector('#progress')!.textContent = state.loading ? 'Reading target page…' : '';
  previous.disabled = state.loading || !state.hasPrevious;next.disabled = state.loading || !state.hasNext;
  document.body.dataset.loading = String(state.loading);
});
previous.onclick = () => { void list.previous(); };next.onclick = () => { void list.next(); };
document.querySelector<HTMLButtonElement>('#fail')!.onclick = () => { failNext = true;void list.next(); };
document.querySelector<HTMLButtonElement>('#closed')!.onclick = () => { void list.setQuery({ status: 'closed' },'demo:closed:2'); };
document.querySelector<HTMLButtonElement>('#open')!.onclick = () => { void list.setQuery({ status: 'open' },'demo:open:2'); };
document.querySelector<HTMLButtonElement>('#refresh')!.onclick = () => { void list.refresh(); };
void list.refresh();
