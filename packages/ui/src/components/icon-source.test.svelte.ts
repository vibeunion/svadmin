import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Icon from './Icon.svelte';
import {
  builtinIcons,
  registerIconSource,
  registerIconSources,
  registerIcons,
  resetIconRegistry,
  resolveIconSource,
} from '../icons.js';

const FakeIcon = (() => null) as unknown as (typeof builtinIcons)[string];

afterEach(() => {
  cleanup();
  resetIconRegistry();
});

describe('icon sources', () => {
  it('registers sprite and remote sources and validates their shape', () => {
    registerIconSources({
      'report': { type: 'sprite', url: '/icons/sprite.svg', symbolPrefix: 'ui-' },
      'invoice': { type: 'remote-svg', urlTemplate: '/icons/{name}.svg' },
      'broken-sprite': { type: 'sprite', url: '' } as never,
      'broken-remote': { type: 'remote-svg', urlTemplate: '/icons/static.svg' } as never,
    });
    expect(resolveIconSource('report')).toEqual({ type: 'sprite', url: '/icons/sprite.svg', symbolPrefix: 'ui-' });
    expect(resolveIconSource('invoice')).toEqual({ type: 'remote-svg', urlTemplate: '/icons/{name}.svg' });
    expect(resolveIconSource('broken-sprite')).toBeUndefined();
    expect(resolveIconSource('broken-remote')).toBeUndefined();
  });

  it('prefers a registered component over a source', () => {
    registerIcons({ report: FakeIcon });
    registerIconSources({ report: { type: 'sprite', url: '/sprite.svg' } });
    const view = render(Icon, { name: 'report', label: 'Report' });
    expect(view.container.querySelector('use')).toBeNull();
    expect(view.container.querySelector('svg')).toBeNull();
  });

  it('renders a sprite symbol server-compatibly', () => {
    registerIconSources({ 'report': { type: 'sprite', url: '/icons/sprite.svg', symbolPrefix: 'ui-' } });
    const view = render(Icon, { name: 'report', label: 'Report', size: 20 });
    const use = view.container.querySelector('use');
    expect(use?.getAttribute('href')).toBe('/icons/sprite.svg#ui-report');
    const svg = view.container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Report');
    expect(svg?.getAttribute('width')).toBe('20');
  });

  it('renders a remote SVG image and escapes the name', () => {
    registerIconSources({ 'remote set': { type: 'remote-svg', urlTemplate: '/icons/{name}.svg' } });
    const view = render(Icon, { name: 'remote set', label: 'Remote' });
    const img = view.container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/icons/remote%20set.svg');
    expect(img?.getAttribute('alt')).toBe('Remote');
  });

  it('renders nothing for an unknown name instead of throwing', () => {
    const view = render(Icon, { name: 'missing' });
    expect(view.container.querySelector('svg')).toBeNull();
    expect(view.container.querySelector('img')).toBeNull();
  });

  it('clears sources on reset', () => {
    registerIconSources({ 'report': { type: 'sprite', url: '/icons/sprite.svg' } });
    resetIconRegistry();
    expect(resolveIconSource('report')).toBeUndefined();
  });

  it('registers one sprite source for every unresolved name', () => {
    registerIconSource({ type: 'sprite', url: '/icons/sprite.svg', symbolPrefix: 'ui-' });
    expect(resolveIconSource('report')).toEqual({ type: 'sprite', url: '/icons/sprite.svg', symbolPrefix: 'ui-' });
    const view = render(Icon, { name: 'report' });
    expect(view.container.querySelector('use')?.getAttribute('href')).toBe('/icons/sprite.svg#ui-report');
  });
});
