import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PrintableReportLayout from './PrintableReportLayout.svelte';
import { usePrintExport } from './usePrintExport.svelte.js';

describe('PrintableReportLayout and usePrintExport suite', () => {
  it('initializes usePrintExport and safely calls print', () => {
    const printMock = vi.fn();
    window.print = printMock;

    const tool = usePrintExport();
    expect(tool.isPrinting).toBe(false);

    const ok = tool.print();
    expect(ok).toBe(true);
    expect(printMock).toHaveBeenCalled();
  });

  it('renders PrintableReportLayout with metadata, signatures, and triggers print', async () => {
    window.print = vi.fn();

    const view = render(PrintableReportLayout, {
      title: 'Q4 财务收支凭证',
      reportNo: 'DOC-2026-9901',
      metadata: [{ label: '制单人', value: '张财务' }],
      signatures: [{ role: '审核主管', name: '李主管' }],
      watermarkText: 'CONFIDENTIAL',
    });

    expect(view.container.textContent).toContain('Q4 财务收支凭证');
    expect(view.container.textContent).toContain('DOC-2026-9901');
    expect(view.container.textContent).toContain('制单人');
    expect(view.container.textContent).toContain('张财务');
    expect(view.container.textContent).toContain('审核主管');
    expect(view.container.textContent).toContain('李主管');

    const printBtn = view.container.querySelector('button');
    expect(printBtn).toBeTruthy();
    if (printBtn) {
      await fireEvent.click(printBtn);
      expect(window.print).toHaveBeenCalled();
    }
  });
});
