import { render } from 'svelte/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setLocale } from '@svadmin/core/i18n';
import SpreadsheetView from './SpreadsheetView.svelte';
import LiteSpreadsheetView from '../../../lite/src/components/LiteSpreadsheetView.svelte';

beforeEach(() => setLocale('en'));

describe('bounded spreadsheet server rendering', () => {
  it('renders Lite native fields, sheet identity and raw formulas without a client runtime', () => {
    const { body } = render(LiteSpreadsheetView, { props: {
      sheets: [{ id: 'report', name: 'Report', rows: 1, cols: 27, cells: { AA1: '=1+1' } }],
      formAction: '/save',
    } });
    expect(body).toContain('method="POST"');
    expect(body).toContain('action="/save"');
    expect(body).toContain('name="sheetId" value="report"');
    expect(body).toContain('name="cell_AA1" value="=1+1"');
    expect(body).not.toContain('<script');
  });

  it('evaluates supported SPA formulas during SSR without browser globals', () => {
    const { body } = render(SpreadsheetView, { props: {
      readonly: true,
      sheets: [{ id: 'report', name: 'Report', rows: 1, cols: 2, cells: { A1: '2', B1: '=A1+3' } }],
    } });
    expect(body).toContain('aria-label="B1"');
    expect(body).toContain('value="5"');
  });

  it('rejects oversized Lite grids on the server before rendering form controls', () => {
    const { body } = render(LiteSpreadsheetView, { props: {
      sheets: [{ id: 'report', name: 'Report', rows: 1_000_000_000, cols: 1, cells: {} }],
    } });
    expect(body).toContain('role="alert"');
    expect(body).not.toContain('<table');
    expect(body).not.toContain('<form');
  });
});
