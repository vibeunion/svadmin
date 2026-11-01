import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { resolvePopupContainer } from './ConfigProvider.svelte';
import { resolvePopupAnchor } from './ui/popup-anchor.js';
import OpenPopupHost from './popup-portal-host.svelte';

afterEach(() => cleanup());

function workspaceId(node: HTMLElement | null | undefined): string | null {
  return node?.closest<HTMLElement>('[data-testid]')?.getAttribute('data-testid') ?? null;
}

describe('generic popup anchors', () => {
  it('passes each trigger or sheet anchor into its own workspace', async () => {
    const calls: Array<HTMLElement | null | undefined> = [];
    render(OpenPopupHost, { calls, useCustomContainer: true });

    const dialog = await screen.findByText('Dialog body');
    const popover = await screen.findByText('Popover body');
    const tooltip = await screen.findByText('Tooltip body', {}, { timeout: 1000 }).catch(() => screen.getByText('Tooltip body', { hidden: true }));
    const sheet = await screen.findByText('Sheet body');

    expect(dialog.closest('[data-testid="workspace-a"]')).toBeTruthy();
    expect(popover.closest('[data-testid="workspace-b"]')).toBeTruthy();
    expect(tooltip.closest('[data-testid="workspace-a"]')).toBeTruthy();
    expect(sheet.closest('[data-testid="workspace-b"]')).toBeTruthy();
    expect(dialog.closest('[data-testid="workspace-b"]')).toBeNull();
    expect(sheet.closest('[data-testid="workspace-a"]')).toBeNull();

    const nodes = calls.filter((node): node is HTMLElement => node instanceof HTMLElement);
    expect(nodes.some((node) => node.matches('[data-dialog-trigger], [data-slot="dialog-trigger"]') && workspaceId(node) === 'workspace-a')).toBe(true);
    expect(nodes.some((node) => node.matches('[data-popover-trigger]') && workspaceId(node) === 'workspace-b')).toBe(true);
    expect(nodes.some((node) => node.matches('[data-tooltip-trigger], [data-slot="tooltip-trigger"]') && workspaceId(node) === 'workspace-a')).toBe(true);
    expect(nodes.some((node) => node.getAttribute('data-svadmin-popup-anchor') === 'sheet' && workspaceId(node) === 'workspace-b')).toBe(true);
    expect(nodes.some((node) => node.getAttribute('data-svadmin-popup-anchor') === 'sheet' && node.matches('[data-popover-trigger]'))).toBe(false);
  });

  it('pairs a trigger with the following marker of the same kind', () => {
    const root = document.createElement('div');
    root.innerHTML = [
      '<button id="dialog-trigger" data-dialog-trigger data-state="open"></button>',
      '<span id="dialog-marker" data-svadmin-popup-anchor="dialog"></span>',
      '<button id="popover-trigger" data-popover-trigger data-state="closed"></button>',
      '<span id="popover-marker" data-svadmin-popup-anchor="popover"></span>',
      '<span id="sheet-marker" data-svadmin-popup-anchor="sheet"></span>',
    ].join('');
    document.body.append(root);

    const dialogMarker = root.querySelector<HTMLElement>('#dialog-marker');
    const popoverMarker = root.querySelector<HTMLElement>('#popover-marker');
    const sheetMarker = root.querySelector<HTMLElement>('#sheet-marker');
    const dialogTrigger = root.querySelector<HTMLElement>('#dialog-trigger');

    expect(resolvePopupAnchor(null, dialogMarker, 'dialog')?.id).toBe('dialog-trigger');
    expect(resolvePopupAnchor(null, popoverMarker, 'popover')?.id).toBe('popover-trigger');
    expect(resolvePopupAnchor(null, sheetMarker, 'sheet')).toBe(sheetMarker);
    expect(resolvePopupAnchor(dialogTrigger, sheetMarker, 'sheet')).toBe(dialogTrigger);

    root.remove();
  });

  it('resolves an element or a selector when HTMLElement exists', () => {
    const target = document.createElement('div');
    target.id = 'popup-root';
    document.body.append(target);

    expect(resolvePopupContainer(() => target)).toBe(target);
    expect(resolvePopupContainer(() => '#popup-root')).toBe(target);
    expect(resolvePopupContainer((node) => node?.closest('#popup-root'), target)).toBe(target);

    target.remove();
  });
});
