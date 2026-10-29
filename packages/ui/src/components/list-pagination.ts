export type ListPaginationItem = number | 'ellipsis';

/** Stable compact page list for desktop list footers. */
export function listPaginationItems(page: number, totalPages: number, maxVisible = 7): ListPaginationItem[] {
  const total = Math.max(1, Math.trunc(totalPages));
  const current = Math.min(Math.max(1, Math.trunc(page)), total);
  if (total <= maxVisible) return Array.from({ length: total }, (_, index) => index + 1);
  const items: ListPaginationItem[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push('ellipsis');
  for (let value = start; value <= end; value += 1) items.push(value);
  if (end < total - 1) items.push('ellipsis');
  items.push(total);
  return items;
}
