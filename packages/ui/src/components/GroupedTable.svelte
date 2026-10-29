<script lang="ts" generics="T">
  import * as Table from './ui/table/index.js';
  import type { TableColumn } from './grouped-table.js';
  import { cn } from '../utils.js';

  interface HeaderCell<T> {
    column: TableColumn<T>;
    colspan: number;
    rowspan: number;
    leaf: boolean;
  }

  interface Props {
    columns: TableColumn<T>[];
    rows: T[];
    rowKey?: (row: T, index: number) => string | number;
    caption?: string;
    emptyText?: string;
    striped?: boolean;
    bordered?: boolean;
    stickyHeader?: boolean;
    class?: string;
  }

  let {
    columns,
    rows,
    rowKey,
    caption,
    emptyText = 'No data',
    striped = false,
    bordered = false,
    stickyHeader = false,
    class: className,
  }: Props = $props();

  function depth(column: TableColumn<T>): number {
    return column.children?.length ? 1 + Math.max(...column.children.map(depth)) : 1;
  }

  function leafCount(column: TableColumn<T>): number {
    return column.children?.length ? column.children.reduce((sum, child) => sum + leafCount(child), 0) : 1;
  }

  function leaves(items: TableColumn<T>[]): TableColumn<T>[] {
    return items.flatMap((column) => column.children?.length ? leaves(column.children) : [column]);
  }

  const maxDepth = $derived(Math.max(...columns.map(depth), 1));
  const leafColumns = $derived(leaves(columns));

  const headerRows = $derived.by<HeaderCell<T>[][]>(() => {
    const result: HeaderCell<T>[][] = Array.from({ length: maxDepth }, () => []);
    const visit = (items: TableColumn<T>[], level: number) => {
      for (const column of items) {
        if (column.children?.length) {
          result[level]?.push({ column, colspan: leafCount(column), rowspan: 1, leaf: false });
          visit(column.children, level + 1);
        } else {
          result[level]?.push({
            column,
            colspan: 1,
            rowspan: Math.max(1, maxDepth - level),
            leaf: true,
          });
        }
      }
    };
    visit(columns, 0);
    return result;
  });

  function valueOf(row: T, key: string): unknown {
    return key.split('.').reduce<unknown>((current, part) => {
      if (current && typeof current === 'object' && part in current) {
        return (current as Record<string, unknown>)[part];
      }
      return undefined;
    }, row);
  }

  function widthOf(column: TableColumn<T>): string | undefined {
    if (column.width === undefined) return undefined;
    return typeof column.width === 'number' ? `${column.width}px` : column.width;
  }

  function keyOf(row: T, index: number): string | number {
    return rowKey?.(row, index) ?? index;
  }

  function alignClass(column: TableColumn<T>): string {
    if (column.align === 'center') return 'text-center';
    if (column.align === 'right') return 'text-right';
    return 'text-left';
  }
</script>

<div class={cn('svadmin-grouped-table', className)}>
  <Table.Root class={cn(bordered && 'svadmin-table--bordered')}>
    {#if caption}<caption class="sr-only">{caption}</caption>{/if}
    <Table.Header class={cn(stickyHeader && 'svadmin-grouped-table__sticky')}>
      {#each headerRows as row, level (level)}
        <Table.Row>
          {#each row as cell (cell.column.key)}
            <Table.Head
              colspan={cell.colspan}
              rowspan={cell.rowspan}
              style={widthOf(cell.column) ? `width:${widthOf(cell.column)}` : undefined}
              class={cn(alignClass(cell.column), !cell.leaf && 'text-center')}
              scope={cell.leaf ? 'col' : 'colgroup'}
            >
              {cell.column.title}
            </Table.Head>
          {/each}
        </Table.Row>
      {/each}
    </Table.Header>
    <Table.Body>
      {#if rows.length === 0}
        <Table.Row>
          <Table.Cell colspan={leafColumns.length} class="h-24 text-center text-muted-foreground">
            {emptyText}
          </Table.Cell>
        </Table.Row>
      {:else}
        {#each rows as row, index (keyOf(row, index))}
          <Table.Row class={cn(striped && index % 2 === 1 && 'svadmin-grouped-table__striped')}>
            {#each leafColumns as column (column.key)}
              <Table.Cell class={alignClass(column)}>
                {#if column.cell}
                  {@render column.cell(valueOf(row, column.key), row)}
                {:else}
                  {valueOf(row, column.key) ?? '—'}
                {/if}
              </Table.Cell>
            {/each}
          </Table.Row>
        {/each}
      {/if}
    </Table.Body>
  </Table.Root>
</div>
