import { describe, expect, test } from 'bun:test';
import { filterInspectorRows, redactValueSummary, type DevtoolsInspectorRow } from './devtools-inspector';

const rows: DevtoolsInspectorRow[] = [
  {
    id: 'q1',
    kind: 'query',
    provider: 'default',
    resource: 'posts',
    operation: 'data:list',
    status: 'success',
    component: 'AutoTable',
    trigger: 'fetch',
    source: 'AutoTable',
    requestSummary: 'object{resource}',
    responseSummary: 'object{data}',
  },
  {
    id: 'm1',
    kind: 'mutation',
    provider: 'mutation',
    resource: '[mutation]',
    operation: 'mutation',
    status: 'pending',
    component: 'AutoForm',
    trigger: 'submit',
    source: 'AutoForm',
    requestSummary: 'object{title}',
    responseSummary: 'undefined',
  },
];

describe('devtools inspector', () => {
  test('redacts values and secret-shaped keys', () => {
    const summary = redactValueSummary({
      data: [{ id: 1, token: 'sensitive-cache-record', note: 'visible-should-not-leak' }],
    });
    expect(summary).toContain('data');
    expect(summary).not.toContain('sensitive-cache-record');
    expect(summary).not.toContain('visible-should-not-leak');
    expect(redactValueSummary({ apiKey: 'sk_live_secret' })).toContain('apiKey:[redacted]');
    expect(redactValueSummary({ apiKey: 'sk_live_secret' })).not.toContain('sk_live_secret');
  });

  test('filters by query text, kind, resource, status, and component', () => {
    expect(filterInspectorRows(rows, {
      text: 'posts',
      kind: 'query',
      resource: 'posts',
      status: 'success',
      component: 'table',
    })).toEqual([rows[0]]);
    expect(filterInspectorRows(rows, {
      text: 'pending',
      kind: 'mutation',
      resource: 'all',
      status: 'all',
      component: '',
    })).toEqual([rows[1]]);
    expect(filterInspectorRows(rows, {
      text: 'missing',
      kind: 'all',
      resource: 'all',
      status: 'all',
      component: '',
    })).toEqual([]);
  });
});
