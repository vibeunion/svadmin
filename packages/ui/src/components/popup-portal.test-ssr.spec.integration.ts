import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { defaultGetPopupContainer, resolvePopupContainer } from './ConfigProvider.svelte';
import OpenPopupHost from './popup-portal-host.svelte';

describe('popup portal server rendering', () => {
  it('resolves popup containers without HTMLElement', () => {
    expect(typeof HTMLElement).toBe('undefined');
    const seen: Array<HTMLElement | undefined> = [];

    expect(() => resolvePopupContainer((node) => {
      seen.push(node);
      return node?.closest('.workspace');
    })).not.toThrow();
    expect(seen).toEqual([undefined]);
    expect(resolvePopupContainer(() => '.workspace')).toBeUndefined();
    expect(resolvePopupContainer(defaultGetPopupContainer)).toBeUndefined();
  });

  it('renders open dialog, popover, tooltip and sheet portals', () => {
    expect(typeof HTMLElement).toBe('undefined');
    const calls: Array<HTMLElement | null | undefined> = [];

    const result = render(OpenPopupHost, {
      props: { calls, useCustomContainer: true },
    });

    expect(result.body).toContain('Open dialog');
    expect(result.body).toContain('Open popover');
    expect(result.body).toContain('Open tooltip');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((node) => node == null)).toBe(true);
  });

  it('renders open portals with the default popup container', () => {
    const result = render(OpenPopupHost, {
      props: { useCustomContainer: false },
    });

    expect(result.body).toContain('Open dialog');
    expect(result.body).toContain('data-svadmin-popup-anchor="sheet"');
  });
});
