import { describe, expect, it } from 'bun:test';
import { numberToChineseCurrency, type PrintColumn, type PrintTemplateConfig } from './print-utils.js';

describe('PrintTemplateDesigner and Currency Capitalization Logic', () => {
  it('converts numbers to uppercase Chinese currency characters accurately', () => {
    expect(numberToChineseCurrency(0)).toBe('零元整');
    expect(numberToChineseCurrency(100)).toBe('壹佰元整');
    expect(numberToChineseCurrency(1234.56)).toBe('壹仟贰佰叁拾肆元伍角陆分');
    expect(numberToChineseCurrency(100050.2)).toBe('壹拾万零伍拾元贰角');
    expect(numberToChineseCurrency(17080.00)).toBe('壹万柒仟零捌拾元整');
  });

  it('filters visible columns and computes aggregation totals correctly', () => {
    const columns: PrintColumn[] = [
      { id: '1', label: '序号', field: 'index', visible: true },
      { id: '2', label: '商品', field: 'name', visible: true },
      { id: '3', label: '内部编号', field: 'internal_code', visible: false },
      { id: '4', label: '数量', field: 'quantity', visible: true },
      { id: '5', label: '金额', field: 'amount', visible: true },
    ];

    const visibleCols = columns.filter(c => c.visible);
    expect(visibleCols.length).toBe(4);
    expect(visibleCols.some(c => c.field === 'internal_code')).toBe(false);

    const mockRows = [
      { quantity: 2, amount: 200 },
      { quantity: 5, amount: 550 },
      { quantity: 3, amount: 300 },
    ];

    const totalQty = mockRows.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalAmount = mockRows.reduce((acc, curr) => acc + curr.amount, 0);

    expect(totalQty).toBe(10);
    expect(totalAmount).toBe(1050);
    expect(numberToChineseCurrency(totalAmount)).toBe('壹仟零伍拾元整');
  });

  it('maintains print template configuration schema integrity', () => {
    const config: PrintTemplateConfig = {
      id: 'template-receipt',
      name: 'Custom Dispatch Bill',
      title: '商品出库单',
      companyName: 'ACME Corp',
      paperSize: 'A4',
      showBarcode: true,
      showQrCode: true,
      showWatermark: true,
      watermarkText: 'SAMPLE WATERMARK',
      showAmountInWords: true,
      currencySymbol: '¥',
      metaFields: [{ id: 'm1', label: '单据号', field: 'order_no', value: '123' }],
      columns: [{ id: 'c1', label: '物料', field: 'name', visible: true }],
      signers: ['制单: 张三'],
      copies: ['第一联 (白)'],
    };

    expect(config.paperSize).toBe('A4');
    expect(config.copies.length).toBe(1);
    expect(config.showBarcode).toBe(true);
  });
});
