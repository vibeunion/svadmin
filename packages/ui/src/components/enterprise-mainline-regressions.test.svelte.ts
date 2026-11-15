import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PrintDocument from './PrintDocument.svelte';
import PrintPreviewModal from './PrintPreviewModal.svelte';
import PrintTemplateDesigner from './PrintTemplateDesigner.svelte';
import DataImportPipeline from './DataImportPipeline.svelte';
import MediaAuthenticityAuditCard, { type MediaAuthenticityData } from './MediaAuthenticityAuditCard.svelte';
import AudioVisualInspector from './AudioVisualInspector.svelte';
import { currencyMinorUnits, numberToChineseCurrency, PRINT_PAPER_DIMENSIONS, type PrintTemplateConfig } from './print-utils.js';
import { printDocument } from './print-document.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const config: PrintTemplateConfig = {
  id: 'test', name: 'test', title: '出库单', companyName: 'CALLER_COMPANY', paperSize: 'A4',
  showBarcode: true, showQrCode: true, showWatermark: false, showAmountInWords: true,
  currencySymbol: '¥', metaFields: [], signers: [],
  copies: ['存根联', '客户联', '财务联'],
  columns: [{ id: 'name', label: '商品', field: 'name', visible: true }],
};
const media: MediaAuthenticityData = {
  id: 'a', fileName: 'caller.jpg', fileSizeMb: 1, mimeType: 'image/jpeg',
  riskLevel: 'safe', tamperConfidencePercent: 0, exif: { capturedAt: '2026-11-15' },
  auditFindings: [],
};
function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function required<T>(candidate: T | null | undefined): T {
  if (candidate == null) throw new Error('Expected test target to exist');
  return candidate;
}

describe('financial printing regressions', () => {
  it.each([[1.15, '壹元壹角伍分'], [0.29, '贰角玖分'], [8.03, '捌元叁分'],
    [1.005, '壹元壹分'], [9.995, '壹拾元整']])('rounds %s without losing cents', (amount, words) => {
    expect(numberToChineseCurrency(amount as number)).toBe(words);
  });
  it('handles finite bounds and scientific notation explicitly', () => {
    expect(currencyMinorUnits(1e-7)).toBe(0);
    expect(currencyMinorUnits(999999999999.99)).toBe(99999999999999);
    expect(numberToChineseCurrency(Infinity)).toBe('金额无效');
    expect(numberToChineseCurrency(NaN)).toBe('金额无效');
    expect(() => currencyMinorUnits(1e12)).toThrow(RangeError);
    expect(numberToChineseCurrency(999999999999.995)).toBe('金额无效');
    expect(numberToChineseCurrency(-999999999999.995)).toBe('金额无效');
  });
  it('uses caller items reactively and does not insert demo rows for empty items', async () => {
    const view = render(PrintTemplateDesigner, { config, sampleData: { items: [
      { name: 'CALLER_PRODUCT', quantity: 2, total_amount: 20 },
    ] } });
    expect(view.container.textContent).toContain('CALLER_PRODUCT');
    expect(view.container.textContent).toContain('总件数: 2 件');
    await view.rerender({ config, sampleData: { items: [] } });
    expect(view.container.textContent).not.toContain('CALLER_PRODUCT');
    expect(view.container.textContent).not.toContain('PROD-A01');
  });
  it('preserves zero fields in details and totals and prints every configured copy', () => {
    const view = render(PrintPreviewModal, { open: true, config,
      items: [{ name: 'ZERO', quantity: 0, qty: 9, total_amount: 0, amount: 99 }] });
    expect(view.container.querySelectorAll('[data-print-copy]')).toHaveLength(3);
    expect(view.container.textContent).toContain('总件数: 0 件');
    expect(view.container.textContent).not.toContain('99.00');
    expect(view.container.textContent).not.toContain('9 件');
  });
  it.each([0, 1, 2, 7, 8])('keeps summaries outside the %s-column grid', count => {
    const columns = Array.from({ length: count }, (_, index) =>
      ({ id: String(index), field: 'name', label: '商品', visible: true }));
    const view = render(PrintDocument, { config: { ...config, columns }, copies: ['test'] });
    expect(view.container.querySelectorAll('th')).toHaveLength(count);
    expect(view.container.querySelector('tfoot')).toBeNull();
    expect(view.container.textContent).toContain('合计金额: ¥0.00');
  });
  it('encodes caller numbers into real barcode and QR output', async () => {
    const view = render(PrintDocument, { config, data: { order_no: 'CALLER-123' }, copies: ['test'] });
    const qr = () => view.container.querySelector('.svadmin-qr-code__svg path')?.getAttribute('d');
    const before = qr();
    expect(before).toBeTruthy();
    expect(view.container.querySelector('[aria-label="Barcode for CALLER-123"]')).not.toBeNull();
    await view.rerender({ config, data: { order_no: 'CALLER-456' }, copies: ['test'] });
    expect(qr()).not.toBe(before);
    await view.rerender({ config: { ...config, showBarcode: false, showQrCode: false }, copies: ['test'] });
    expect(view.container.querySelector('svg')).toBeNull();
  });
  it.each(Object.keys(PRINT_PAPER_DIMENSIONS))('isolates %s printing from the host', async size => {
    const settings = (window as unknown as { happyDOM: { settings: { disableIframePageLoading: boolean; enableIframePageLoading: boolean } } }).happyDOM.settings;
    settings.disableIframePageLoading = false;
    settings.enableIframePageLoading = true;
    const paperSize = size as PrintTemplateConfig['paperSize'];
    const host = document.createElement('div');
    host.textContent = 'HOST_SECRET';
    document.body.append(host);
    const view = render(PrintDocument, { config: { ...config, paperSize }, copies: ['test'] });
    const pending = printDocument(view.container, paperSize);
    const frame = required(document.querySelector('iframe'));
    const printWindow = required(frame.contentWindow);
    const printDocumentNode = required(frame.contentDocument);
    const print = vi.fn();
    Object.defineProperty(printWindow, 'print', { configurable: true, value: print });
    vi.spyOn(printWindow, 'focus').mockImplementation(() => {});
    await pending;
    expect(print).toHaveBeenCalledOnce();
    expect(printDocumentNode.body.textContent).not.toContain('HOST_SECRET');
    expect(printDocumentNode.body.textContent).toContain('CALLER_COMPANY');
    const paper = PRINT_PAPER_DIMENSIONS[paperSize];
    expect(printDocumentNode.head.textContent).toContain(`size: ${paper.width}mm ${paper.height}mm`);
    printWindow.dispatchEvent(new Event('afterprint'));
    expect(frame.isConnected).toBe(false);
    host.remove();
    settings.disableIframePageLoading = true;
    settings.enableIframePageLoading = false;
  });
});

describe('real CSV input', () => {
  it.each([
    ['name,note\n"ACME, Inc","said ""yes"""', 'ACME, Inc', 'said "yes"'],
    ['name,note\r\ncaller,"first\r\nsecond"', 'caller', 'first\r\nsecond'],
  ])('preserves CSV quoting and multiline fields', async (csv, name, note) => {
    const onimport = vi.fn(() => ({ successCount: 1, failCount: 0 }));
    const view = render(DataImportPipeline, { targetFields: [
      { name: 'name', label: 'Name', type: 'string' }, { name: 'note', label: 'Note', type: 'string' },
    ], onimport });
    await fireEvent.input(view.getByRole('textbox'), { target: { value: csv } });
    await fireEvent.click(view.getByRole('button', { name: '开始解析' }));
    await fireEvent.click(view.getByRole('button', { name: /进入数据质检/ }));
    await fireEvent.click(view.getByRole('button', { name: /确认导入/ }));
    expect(onimport).toHaveBeenCalledWith([{ name, note }]);
  });
  it('rejects malformed quotes without advancing', async () => {
    const view = render(DataImportPipeline, { targetFields: [] });
    await fireEvent.input(view.getByRole('textbox'), { target: { value: 'name,note\nx,"unclosed' } });
    await fireEvent.click(view.getByRole('button', { name: '开始解析' }));
    expect(view.getByRole('alert').textContent).toContain('CSV 解析失败');
    expect(view.container.querySelector('textarea')).not.toBeNull();
  });
  it('never claims import success without a host callback', async () => {
    const view = render(DataImportPipeline, { targetFields: [], initialRows: [{ name: 'caller' }] });
    await fireEvent.click(await view.findByRole('button', { name: /进入数据质检/ }));
    expect((view.getByRole('button', { name: /确认导入/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(view.container.textContent).not.toContain('导入完成');
  });
});

describe('media callback contracts', () => {
  it('does not invent missing metadata or forensic findings', () => {
    const view = render(MediaAuthenticityAuditCard, { data: media });
    expect(view.container.textContent).not.toMatch(/24mm|f\/1.8|1\/60s|ISO 100|EXIF 链路完整|证实伪造/);
    expect(view.container.textContent).toContain('未提供');
    expect((view.getByRole('button', { name: /重新核验/ }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('awaits recheck, blocks repeat clicks, and shows rejection', async () => {
    const task = deferred();
    const onRecheck = vi.fn(() => task.promise);
    const view = render(MediaAuthenticityAuditCard, { data: media, onRecheck });
    const button = view.getByRole('button', { name: /重新核验/ }) as HTMLButtonElement;
    await fireEvent.click(button);
    await new Promise(resolve => setTimeout(resolve, 550));
    expect(button.disabled).toBe(true);
    await fireEvent.click(button);
    expect(onRecheck).toHaveBeenCalledTimes(1);
    task.reject(new Error('private backend error'));
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('核验失败'));
    expect(view.container.textContent).not.toContain('private backend error');
    expect(button.disabled).toBe(false);
  });
  it('ignores previous-scope completions, including A to B to A', async () => {
    const old = deferred();
    const fresh = deferred();
    const onRecheck = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const view = render(MediaAuthenticityAuditCard, { data: media, onRecheck });
    await fireEvent.click(view.getByRole('button', { name: /重新核验/ }));
    await view.rerender({ data: { ...media, id: 'b' }, onRecheck });
    await view.rerender({ data: media, onRecheck });
    await fireEvent.click(view.getByRole('button', { name: /重新核验/ }));
    old.reject(new Error('stale'));
    await Promise.resolve();
    expect(view.queryByRole('alert')).toBeNull();
    expect((view.getByRole('button', { name: /重新核验/ }) as HTMLButtonElement).disabled).toBe(true);
    fresh.resolve();
    await waitFor(() => expect((view.getByRole('button', { name: /重新核验/ }) as HTMLButtonElement).disabled).toBe(false));
  });
  it('requests media changes and waits for controlled state updates', async () => {
    const onPlayChange = vi.fn(), onMuteChange = vi.fn(), onPlaybackRateChange = vi.fn();
    const onResultChange = vi.fn();
    const props = { media: { title: 'caller', mediaType: 'audio' as const, durationSeconds: 60 },
      onPlayChange, onMuteChange, onPlaybackRateChange, onResultChange };
    const view = render(AudioVisualInspector, props);
    await fireEvent.click(view.getByRole('button', { name: '播放', exact: true }));
    await fireEvent.click(view.getByRole('button', { name: '静音', exact: true }));
    await fireEvent.click(view.getByRole('button', { name: '1.5x', exact: true }));
    expect(onPlayChange).toHaveBeenCalledWith(true);
    expect(onMuteChange).toHaveBeenCalledWith(true);
    expect(onPlaybackRateChange).toHaveBeenCalledWith(1.5);
    expect(view.queryByRole('button', { name: '暂停', exact: true })).toBeNull();
    await view.rerender({ ...props, isPlaying: true, isMuted: true, playbackRate: 1.5 });
    expect(view.getByRole('button', { name: '暂停', exact: true })).toBeTruthy();
    expect(onResultChange).toHaveBeenCalledWith('passed', 100);
  });
});
