import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import LiteCapabilityBoundary from './compatibility/LiteCapabilityBoundary.svelte';
import LiteClipboardFallback from './compatibility/LiteClipboardFallback.svelte';
import LiteComputeFallback from './compatibility/LiteComputeFallback.svelte';
import LiteDirectoryUpload from './compatibility/LiteDirectoryUpload.svelte';
import LiteOrderedList from './compatibility/LiteOrderedList.svelte';
import LiteRealtimeStatus from './compatibility/LiteRealtimeStatus.svelte';
import LiteVisualFallback from './compatibility/LiteVisualFallback.svelte';

afterEach(() => {
  document.head.querySelectorAll('meta[http-equiv="refresh"]').forEach((node) => node.remove());
});

describe('Lite compatibility fallbacks', () => {
  it('renders an accessible structured visual fallback', () => {
    const { container } = render(LiteVisualFallback, {
      title: 'Flow snapshot',
      description: 'Nodes and edges remain readable without a canvas runtime.',
      columns: [{ key: 'id', label: 'ID' }, { key: 'label', label: 'Label' }],
      rows: [{ id: 'n1', label: 'Start' }],
      downloadHref: '/exports/flow.json',
    });

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('table')).toBeTruthy();
    expect(container.textContent).toContain('Start');
    expect(container.querySelector('a[href="/exports/flow.json"]')).toBeTruthy();
  });

  it('keeps directory upload usable as multiple files and ZIP fallback', () => {
    const { container } = render(LiteDirectoryUpload, { name: 'files', zipName: 'bundle' });
    const directoryInput = container.querySelector<HTMLInputElement>('input[name="files"]');
    const zipInput = container.querySelector<HTMLInputElement>('input[name="bundle"]');

    expect(directoryInput?.type).toBe('file');
    expect(directoryInput?.multiple).toBe(true);
    expect(directoryInput?.hasAttribute('webkitdirectory')).toBe(true);
    expect(directoryInput?.hasAttribute('directory')).toBe(true);
    expect(directoryInput?.required).toBe(false);
    expect(zipInput?.accept).toContain('application/zip');
  });

  it('renders realtime refresh and compute actions as native HTML', () => {
    const realtime = render(LiteRealtimeStatus, {
      refreshHref: '/lite/status',
      refreshSeconds: 10,
      lastUpdated: '2026-08-28 10:00',
    });
    expect(realtime.container.querySelector('a[href="/lite/status"]')).toBeTruthy();
    expect(document.head.querySelector('meta[http-equiv="refresh"]')?.getAttribute('content'))
      .toBe('10; url=/lite/status');
    realtime.unmount();

    const compute = render(LiteComputeFallback, {
      action: '?/run',
      values: { job: 'report', priority: 1 },
    });
    expect(compute.container.querySelector('form[method="POST"]')).toBeTruthy();
    expect(compute.container.querySelector('[name="job"]')?.getAttribute('value')).toBe('report');
  });

  it('uses structured actions for drag and clipboard fallbacks', () => {
    const ordered = render(LiteOrderedList, {
      action: '?/move',
      items: [{ id: 'a', label: 'First' }, { id: 'b', label: 'Second' }],
    });
    expect(ordered.container.querySelectorAll('form[method="POST"]')).toHaveLength(4);
    expect(ordered.container.querySelector('button[disabled]')).toBeTruthy();
    ordered.unmount();

    const clipboard = render(LiteClipboardFallback, { value: 'copy me' });
    expect(clipboard.container.querySelector('textarea')?.value).toBe('copy me');
    expect(clipboard.container.textContent).toContain('manual');
  });

  it('renders the documented fallback by default and allows explicit enhancement', () => {
    const fallback = render(LiteCapabilityBoundary, { capability: 'websocket' });
    expect(fallback.container.firstElementChild?.getAttribute('data-lite-mode')).toBe('fallback');
    expect(fallback.container.textContent).toContain('last snapshot');
    fallback.unmount();

    const enhanced = render(LiteCapabilityBoundary, { capability: 'websocket', enhanced: true });
    expect(enhanced.container.firstElementChild?.getAttribute('data-lite-mode')).toBe('enhanced');
  });

  it('fails closed for executable links and form actions', () => {
    const visual = render(LiteVisualFallback, {
      title: 'Unsafe visual',
      snapshotSrc: 'javascript:alert(1)',
      downloadHref: 'javascript:alert(2)',
    });
    expect(visual.container.querySelector('img')).toBeNull();
    expect(visual.container.querySelector('a')).toBeNull();
    visual.unmount();

    const compute = render(LiteComputeFallback, {
      action: 'javascript:alert(3)',
      downloadHref: 'javascript:alert(4)',
    });
    expect(compute.container.querySelector('form')).toBeNull();
    expect(compute.container.querySelector('button[disabled]')).toBeTruthy();
    expect(compute.container.querySelector('a')).toBeNull();
    compute.unmount();

    const ordered = render(LiteOrderedList, {
      action: 'javascript:alert(5)',
      items: [{ id: 'a', label: 'First' }],
    });
    expect(ordered.container.querySelector('form')).toBeNull();
    expect(ordered.container.querySelectorAll('button[disabled]')).toHaveLength(2);
    ordered.unmount();

    const realtime = render(LiteRealtimeStatus, {
      refreshHref: 'javascript:alert(6)',
      refreshSeconds: 10,
    });
    expect(realtime.container.querySelector('a')).toBeNull();
    expect(document.head.querySelector('meta[http-equiv="refresh"]')).toBeNull();
  });
});
