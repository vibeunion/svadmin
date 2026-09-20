import { render } from 'svelte/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PivotDrilldown } from '@svadmin/core/pivot';
import { setLocale } from '@svadmin/core/i18n';
import PivotTable from './PivotTable.svelte';
import LitePivotTable from '../../../lite/src/components/LitePivotTable.svelte';

const fields = { rowField: 'r', columnField: 'c', valueField: 'v' };
beforeEach(() => setLocale('en'));

describe.each([['SPA', PivotTable], ['Lite', LitePivotTable]] as const)('%s pivot SSR', (_name, Component) => {
  it('renders a pre-aggregated snapshot without recomputing server totals', () => {
    const { body } = render(Component, { props: {
      ...fields, aggregator: 'avg', aggregateData: {
        rows: [{ key: 'r', value: 1, label: 'One' }],
        columns: [{ key: 'c', value: 'X', label: 'X' }],
        cells: [{ rowKey: 'r', columnKey: 'c', value: 12 }],
        rowTotals: [{ key: 'r', value: 12 }],
        columnTotals: [{ key: 'c', value: 12 }],
        grandTotal: 7,
      },
    } });
    expect(body).toMatch(/>7<\/td>/);
    expect(body).toContain('One');
  });
  it('renders distinct dimensions and correct aggregates without browser globals', () => {
    const { body } = render(Component, { props: {
      ...fields, data: [{ r: 1, c: 'X', v: 3 }, { r: '1', c: 'X', v: 7 }],
    } });
    expect(body).toContain('scope="row"');
    expect(body.match(/<tr[\s>]/g)).toHaveLength(4);
    expect(body).toMatch(/>10<\/td>/);
    expect(body).not.toContain('<script');
  });

  it('rejects oversized inputs on the server before creating the table', () => {
    const { body } = render(Component, { props: {
      ...fields, data: Array.from({ length: 10_001 }, () => ({ r: 'A', c: 'X', v: 1 })),
    } });
    expect(body).toContain('role="alert"');
    expect(body).not.toContain('<table');
  });
});

it('does not dispatch an async aggregate provider during SSR', () => {
  let called = false;
  const { body } = render(PivotTable, { props: {
    ...fields, resource: 'orders', scopeKey: 'alice',
    provider: { aggregate: async () => { called = true; return {}; } },
  } });
  expect(called).toBe(false);
  expect(body).toContain('Loading');
  expect(body).not.toContain('<table');
});

it('Lite renders a retry link in server HTML, including escaped query parameters', () => {
  const { body } = render(LitePivotTable, { props: {
    ...fields, error: 'Load failed', retryHref: '/reports?retry=1&scope=current',
  } });
  expect(body).toContain('href="/reports?retry=1&amp;scope=current"');
  expect(body).not.toContain('<script');
  expect(body).not.toContain('onclick');
});

describe('Lite native drilldown SSR', () => {
  it('retains typed dimensions and the original condition tree without browser globals', () => {
    const requests: PivotDrilldown[] = [];
    const { body } = render(LitePivotTable, { props: {
      ...fields, resource: 'orders', scopeKey: 'tenant-a',
      filters: [{ operator: 'or', value: [
        { field: 'status', operator: 'eq', value: 'paid' },
        { field: 'status', operator: 'eq', value: 'pending' },
      ] }],
      data: [{ r: 1, c: 'X', v: 3 }, { r: '1', c: 'Y', v: 7 }],
      drilldownHref: request => {
        requests.push(request);
        return '/orders?view=details&scope=a';
      },
    } });
    expect(typeof window).toBe('undefined');
    expect(requests).toHaveLength(2);
    expect(requests[0]?.filters).toEqual([
      { operator: 'or', value: [
        { field: 'status', operator: 'eq', value: 'paid' },
        { field: 'status', operator: 'eq', value: 'pending' },
      ] },
      { field: 'r', operator: 'eq', value: 1 },
      { field: 'c', operator: 'eq', value: 'X' },
    ]);
    expect(requests[1]?.row.value).toBe('1');
    expect(body.match(/href="\/orders\?view=details&amp;scope=a"/g)).toHaveLength(2);
    expect(body).not.toContain('<script');
    expect(body).not.toContain('onclick');
  });

  it('supports pre-aggregated null dimensions and isolates callback mutations', () => {
    const requests: PivotDrilldown[] = [];
    const meta = { tenant: { id: 'a' } };
    const { body } = render(LitePivotTable, { props: {
      ...fields, resource: 'orders', scopeKey: 'a', meta, aggregateData: {
        rows: [{ key: 'null-row', value: null, label: 'Missing' }],
        columns: [{ key: 'c', value: 'X', label: 'X' }],
        cells: [{ rowKey: 'null-row', columnKey: 'c', value: 0 }],
        rowTotals: [{ key: 'null-row', value: 0 }],
        columnTotals: [{ key: 'c', value: 0 }], grandTotal: 0,
      },
      drilldownHref: request => {
        requests.push(request);
        if (request.meta) request.meta['tenant'] = { id: 'changed' };
        return '/details';
      },
    } });
    expect(requests[0]?.filters).toContainEqual({ field: 'r', operator: 'null', value: null });
    expect(meta.tenant.id).toBe('a');
    expect(body).toContain('href="/details"');
    expect(body).toContain('Drill down: Missing / X');
  });

  it.each(['javascript:alert(1)', '//outside.example', '/\\outside.example', '/\tdetails'])(
    'omits unsafe links in server output: %j', href => {
      const { body } = render(LitePivotTable, { props: {
        ...fields, resource: 'orders', scopeKey: 'a',
        data: [{ r: 'A', c: 'X', v: 3 }], drilldownHref: () => href,
      } });
      expect(body).toContain('<table');
      expect(body).not.toContain('<a ');
      expect(body).toContain('>3</td>');
    },
  );

  it('contains callback exceptions and never calls the builder in loading or error states', () => {
    const drilldownHref = vi.fn((): string => { throw new Error('private'); });
    const props = {
      ...fields, resource: 'orders', scopeKey: 'a',
      data: [{ r: 'A', c: 'X', v: 3 }], drilldownHref,
    };
    const { body } = render(LitePivotTable, { props });
    expect(drilldownHref).toHaveBeenCalledOnce();
    expect(body).not.toContain('private');
    expect(body).toContain('<table');
    render(LitePivotTable, { props: { ...props, loading: true } });
    render(LitePivotTable, { props: { ...props, error: 'Unavailable' } });
    expect(drilldownHref).toHaveBeenCalledOnce();
  });
});
