/**
 * Icon registry — resolve icons by name instead of a hardcoded local map.
 *
 * Arco resolves icons from a name (`<IconUser />` / `icon="user"`). svadmin keeps
 * `@lucide/svelte` as the default set, but name resolution must be extensible:
 * third-party plugins contribute icons without patching `Sidebar`, and a missing
 * name must fail predictably instead of rendering nothing.
 *
 * Resolution order: registrations (last write wins) → built-in lucide names →
 * explicit fallback → `undefined`.
 */
import type { Component } from 'svelte';

/** Minimal icon component contract used by navigation surfaces. */
export type IconComponent = Component<Record<string, unknown>>;

/**
 * Non-component icon sources. Design systems that ship a sprite sheet or a CDN
 * set can register names without generating one component per icon.
 */
export type IconSource =
  | { type: 'sprite'; url: string; symbolPrefix?: string }
  | { type: 'remote-svg'; urlTemplate: string };

/** Public registration shape. `url` is a sprite URL or a `{name}` template. */
export interface IconSourceInput {
  type: 'sprite' | 'remote-svg';
  url: string;
  symbolPrefix?: string;
  /** Omit to use this source for every name that has no component. */
  names?: readonly string[];
}

/** Handler invoked once per missing icon name. Keep it cheap: no throwing. */
export type IconMissHandler = (name: string) => void;

export interface IconRegistry {
  /** Register or override icons by name. Names are matched verbatim. */
  registerIcons(icons: Readonly<Record<string, IconComponent>>, options?: { replace?: boolean }): void;
  /** Replace the built-in vocabulary as well as registrations (design-system swap). */
  replaceIcons(icons: Readonly<Record<string, IconComponent>>): void;
  /** Register sprite/remote sources for names that have no component. */
  registerIconSources(sources: Readonly<Record<string, IconSource>>): void;
  /** Register one sprite sheet or remote template, optionally limited to `names`. */
  registerIconSource(source: IconSourceInput): void;
  /** Last registered source wins; components always take precedence at render time. */
  resolveIconSource(name: string | undefined): IconSource | undefined;
  getIconSourceNames(): string[];
  /** Resolve a name, optionally falling back to a caller-provided component. */
  resolveIcon(name: string | undefined, fallback?: IconComponent): IconComponent | undefined;
  hasIcon(name: string): boolean;
  /** Registered names in registration order, built-ins first. */
  getIconNames(): string[];
  /** Component rendered when a name is missing; registration still wins. */
  setIconFallback(icon: IconComponent | undefined): void;
  /** Observe missing names (devtools bridge, warnings, telemetry). */
  setIconMissHandler(handler: IconMissHandler | undefined): void;
  /** Restore built-ins only; intended for tests. */
  resetIconRegistry(): void;
}

function isIconSource(value: unknown): value is IconSource {
  if (typeof value !== 'object' || value === null) return false;
  const type = Reflect.get(value, 'type');
  if (type === 'sprite') {
    const url = Reflect.get(value, 'url');
    const prefix = Reflect.get(value, 'symbolPrefix');
    return typeof url === 'string' && url.length > 0 && (prefix === undefined || typeof prefix === 'string');
  }
  if (type === 'remote-svg') {
    const template = Reflect.get(value, 'urlTemplate');
    return typeof template === 'string' && template.includes('{name}');
  }
  return false;
}

export function createIconRegistry(builtinIcons: Readonly<Record<string, IconComponent>> = {}): IconRegistry {
  const original = new Map(Object.entries(builtinIcons));
  let builtin = new Map(original);
  const registered = new Map<string, IconComponent>();
  const sources = new Map<string, IconSource>();
  let defaultSource: IconSource | undefined;
  const missing = new Set<string>();
  let fallback: IconComponent | undefined;
  let onMiss: IconMissHandler | undefined;
  let missCount = 0;

  function reportMiss(name: string): void {
    // Bound the noise: one report per distinct name, and never more than 50.
    if (!onMiss || missing.has(name) || missCount >= 50) return;
    missing.add(name);
    missCount += 1;
    try {
      onMiss(name);
    } catch {
      // A diagnostic hook must not break navigation rendering.
    }
  }

  return {
    registerIcons(icons, options = {}) {
      if (!options.replace) {
        for (const [name, icon] of Object.entries(icons)) {
          if (name.trim() === '' || typeof icon !== 'function') continue;
          registered.set(name, icon);
        }
        return;
      }
      registered.clear();
      for (const [name, icon] of Object.entries(icons)) {
        if (name.trim() === '' || typeof icon !== 'function') continue;
        registered.set(name, icon);
      }
    },
    replaceIcons(icons) {
      builtin = new Map(
        Object.entries(icons).filter(([name, icon]) => name.trim() !== '' && typeof icon === 'function'),
      );
      registered.clear();
    },
    registerIconSources(next) {
      for (const [name, source] of Object.entries(next)) {
        if (name.trim() === '' || !isIconSource(source)) continue;
        sources.set(name, source);
      }
    },
    registerIconSource(source) {
      const normalized: IconSource | undefined = source.type === 'sprite'
        ? (source.url.length > 0 ? {
            type: 'sprite',
            url: source.url,
            ...(source.symbolPrefix !== undefined ? { symbolPrefix: source.symbolPrefix } : {}),
          } : undefined)
        : (source.url.includes('{name}') ? { type: 'remote-svg', urlTemplate: source.url } : undefined);
      if (normalized === undefined || !isIconSource(normalized)) return;
      const names = source.names?.filter((name) => name.trim() !== '') ?? [];
      if (names.length === 0) {
        defaultSource = normalized;
        return;
      }
      for (const name of names) sources.set(name, normalized);
    },
    resolveIconSource(name) {
      if (name === undefined || name === '') return undefined;
      return sources.get(name) ?? defaultSource;
    },
    getIconSourceNames() {
      return [...sources.keys()];
    },
    resolveIcon(name, fallbackIcon) {
      if (name === undefined || name === '') return fallbackIcon ?? fallback;
      const direct = registered.get(name) ?? builtin.get(name);
      if (direct) return direct;
      reportMiss(name);
      return fallbackIcon ?? fallback;
    },
    hasIcon(name) {
      return registered.has(name) || builtin.has(name);
    },
    getIconNames() {
      return [...new Set([...builtin.keys(), ...registered.keys()])];
    },
    setIconFallback(icon) {
      fallback = icon;
    },
    setIconMissHandler(handler) {
      onMiss = handler;
      missing.clear();
      missCount = 0;
    },
    resetIconRegistry() {
      builtin = new Map(original);
      registered.clear();
      sources.clear();
      defaultSource = undefined;
      fallback = undefined;
      onMiss = undefined;
      missing.clear();
      missCount = 0;
    },
  };
}