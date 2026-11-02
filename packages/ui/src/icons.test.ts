import { describe, expect, it } from 'vitest';
import {
  builtinIcons,
  getIconNames,
  hasIcon,
  registerIcons,
  replaceIcons,
  resetIconRegistry,
  resolveIcon,
  setIconFallback,
  setIconMissHandler,
} from './icons.js';

const FakeIcon = (() => null) as unknown as (typeof builtinIcons)[string];
const OtherIcon = (() => null) as unknown as (typeof builtinIcons)[string];

describe('icon registry', () => {
  it('resolves documented built-in names', () => {
    expect(hasIcon('dashboard')).toBe(true);
    expect(resolveIcon('users')).toBe(builtinIcons['users']);
    expect(getIconNames()).toContain('credit-card');
  });

  it('lets plugins extend and override names', () => {
    try {
      registerIcons({ 'custom-report': FakeIcon, users: OtherIcon });
      expect(resolveIcon('custom-report')).toBe(FakeIcon);
      expect(resolveIcon('users')).toBe(OtherIcon);
    } finally {
      resetIconRegistry();
    }
    expect(resolveIcon('users')).toBe(builtinIcons['users']);
    expect(resolveIcon('custom-report')).toBeUndefined();
    expect(hasIcon('dashboard')).toBe(true);
  });

  it('reports missing names once and falls back predictably', () => {
    const misses: string[] = [];
    try {
      setIconMissHandler((name) => misses.push(name));
      setIconFallback(OtherIcon);
      expect(resolveIcon('nope')).toBe(OtherIcon);
      expect(resolveIcon('nope')).toBe(OtherIcon);
      expect(resolveIcon('nope-2', FakeIcon)).toBe(FakeIcon);
      expect(misses).toEqual(['nope', 'nope-2']);
    } finally {
      resetIconRegistry();
    }
    expect(resolveIcon('nope')).toBeUndefined();
  });

  it('replaces the vocabulary without leaking the previous set', () => {
    try {
      replaceIcons({ only: FakeIcon });
      expect(resolveIcon('only')).toBe(FakeIcon);
      expect(resolveIcon('dashboard')).toBeUndefined();
      expect(getIconNames()).toEqual(['only']);
    } finally {
      resetIconRegistry();
    }
  });

  it('ignores invalid registrations instead of breaking navigation', () => {
    try {
      registerIcons({ '': FakeIcon, broken: 'not-a-component' as unknown as typeof FakeIcon });
      expect(resolveIcon('broken')).toBeUndefined();
      expect(getIconNames()).not.toContain('broken');
    } finally {
      resetIconRegistry();
    }
  });
});