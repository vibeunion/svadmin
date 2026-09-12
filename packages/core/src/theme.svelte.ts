import { definedOptions } from './defined-options';
// Theme — dark/light/system mode + color theme management (Svelte 5 runes)
//
// Supports two class strategies:
//   - 'standard' (default): adds 'dark' class for dark mode (light-first)
//   - 'dark-first': adds 'light' class for light mode (dark-first)

export type ThemeMode='light'|'dark'|'system';
export type ColorTheme='blue'|'green'|'rose'|'orange'|'violet'|'neutral';

/** Controls how the theme class is applied to <html> */
export type ThemeStrategy='standard'|'dark-first';

// ── Color Preset System ──────────────────────────────────

/** A color preset defines CSS variable overrides for light and dark modes. */
export interface ColorPreset {
  /** Unique name (e.g. 'indigo', 'blue') */
  name: string;
  /** Display label (e.g. 'Indigo', 'Blue') */
  label: string;
  /** Preview swatch color (hex) for UI pickers */
  color: string;
  /** CSS variable overrides for light mode */
  light: Record<string,string>;
  /** CSS variable overrides for dark mode */
  dark: Record<string,string>;
}

/** Built-in color presets — consumers can extend via registerColorPreset(). */
export const builtinPresets: Record<string,ColorPreset>=$state({
  neutral: {
    name: 'neutral',
    label: 'Neutral',
    color: '#71717a',
    light: {
      '--primary': 'oklch(0.205 0.006 286)',
      '--primary-foreground': 'oklch(0.985 0 0)',
      '--ring': 'oklch(0.205 0.006 286)',
      '--sidebar-primary': 'oklch(0.205 0.006 286)',
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.205 0.006 286)',
      '--chart-1': 'oklch(0.488 0.243 264.376)',
    },
    dark: {
      '--primary': 'oklch(0.922 0.004 286)',
      '--primary-foreground': 'oklch(0.205 0.006 286)',
      '--ring': 'oklch(0.556 0.004 286)',
      '--sidebar-primary': 'oklch(0.922 0.004 286)',
      '--sidebar-primary-foreground': 'oklch(0.205 0.006 286)',
      '--sidebar-ring': 'oklch(0.556 0.004 286)',
      '--chart-1': 'oklch(0.585 0.233 264)',
    },
  },
  indigo: {
    name: 'indigo',
    label: 'Indigo',
    color: '#4f46e5',
    light: {
      '--primary': 'oklch(0.488 0.243 264.376)',
      '--primary-foreground': 'oklch(0.985 0 0)',
      '--ring': 'oklch(0.488 0.243 264.376)',
      '--sidebar-primary': 'oklch(0.488 0.243 264.376)',
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.488 0.243 264.376)',
      '--chart-1': 'oklch(0.488 0.243 264.376)',
    },
    dark: {
      '--primary': 'oklch(0.585 0.233 264)',
      '--primary-foreground': 'oklch(0.15 0.04 265)',
      '--ring': 'oklch(0.55 0.18 264)',
      '--sidebar-primary': 'oklch(0.585 0.233 264)',
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.55 0.18 264)',
      '--chart-1': 'oklch(0.585 0.233 264)',
    },
  },
  blue: {
    name: 'blue',
    label: 'Blue',
    color: '#3b82f6',
    light: {
      '--primary': 'oklch(0.546 0.245 262.881)',
      '--primary-foreground': 'oklch(0.985 0 0)',
      '--ring': 'oklch(0.546 0.245 262.881)',
      '--sidebar-primary': 'oklch(0.546 0.245 262.881)',
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.546 0.245 262.881)',
      '--chart-1': 'oklch(0.546 0.245 262.881)',
    },
    dark: {
      '--primary': 'oklch(0.623 0.214 259.815)',
      '--primary-foreground': 'oklch(0.15 0.04 265)',
      '--ring': 'oklch(0.546 0.245 262.881)',
      '--sidebar-primary': 'oklch(0.623 0.214 259.815)',
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.546 0.245 262.881)',
      '--chart-1': 'oklch(0.623 0.214 259.815)',
    },
  },
  green: {
    name: 'green',
    label: 'Green',
    color: '#22c55e',
    light: {
      '--primary': 'oklch(0.527 0.185 150.069)',
      '--primary-foreground': 'oklch(0.985 0 0)',
      '--ring': 'oklch(0.527 0.185 150.069)',
      '--sidebar-primary': 'oklch(0.527 0.185 150.069)',
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.527 0.185 150.069)',
      '--chart-1': 'oklch(0.527 0.185 150.069)',
    },
    dark: {
      '--primary': 'oklch(0.627 0.194 149.214)',
      '--primary-foreground': 'oklch(0.15 0.05 150)',
      '--ring': 'oklch(0.527 0.185 150.069)',
      '--sidebar-primary': 'oklch(0.627 0.194 149.214)',
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.527 0.185 150.069)',
      '--chart-1': 'oklch(0.627 0.194 149.214)',
    },
  },
  rose: {
    name: 'rose',
    label: 'Rose',
    color: '#f43f5e',
    light: {
      '--primary': 'oklch(0.577 0.245 27.325)',
      '--primary-foreground': 'oklch(0.985 0 0)',
      '--ring': 'oklch(0.577 0.245 27.325)',
      '--sidebar-primary': 'oklch(0.577 0.245 27.325)',
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.577 0.245 27.325)',
      '--chart-1': 'oklch(0.577 0.245 27.325)',
    },
    dark: {
      '--primary': 'oklch(0.685 0.22 27)',
      '--primary-foreground': 'oklch(0.15 0.04 27)',
      '--ring': 'oklch(0.55 0.18 27)',
      '--sidebar-primary': 'oklch(0.685 0.22 27)',
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.55 0.18 27)',
      '--chart-1': 'oklch(0.685 0.22 27)',
    },
  },
  orange: {
    name: 'orange',
    label: 'Orange',
    color: '#f97316',
    light: {
      '--primary': 'oklch(0.646 0.222 41.116)',
      '--primary-foreground': 'oklch(0.985 0 0)',
      '--ring': 'oklch(0.646 0.222 41.116)',
      '--sidebar-primary': 'oklch(0.646 0.222 41.116)',
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.646 0.222 41.116)',
      '--chart-1': 'oklch(0.646 0.222 41.116)',
    },
    dark: {
      '--primary': 'oklch(0.73 0.195 41)',
      '--primary-foreground': 'oklch(0.15 0.04 41)',
      '--ring': 'oklch(0.6 0.18 41)',
      '--sidebar-primary': 'oklch(0.73 0.195 41)',
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.6 0.18 41)',
      '--chart-1': 'oklch(0.73 0.195 41)',
    },
  },
  violet: {
    name: 'violet',
    label: 'Violet',
    color: '#8b5cf6',
    light: {
      '--primary': 'oklch(0.541 0.281 293.009)',
      '--primary-foreground': 'oklch(0.985 0 0)',
      '--ring': 'oklch(0.541 0.281 293.009)',
      '--sidebar-primary': 'oklch(0.541 0.281 293.009)',
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.541 0.281 293.009)',
      '--chart-1': 'oklch(0.541 0.281 293.009)',
    },
    dark: {
      '--primary': 'oklch(0.65 0.25 293)',
      '--primary-foreground': 'oklch(0.15 0.04 293)',
      '--ring': 'oklch(0.52 0.2 293)',
      '--sidebar-primary': 'oklch(0.65 0.25 293)',
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-ring': 'oklch(0.52 0.2 293)',
      '--chart-1': 'oklch(0.65 0.25 293)',
    },
  },
});

/** Register a custom color preset. Overwrites any built-in preset with the same name. */
export function registerColorPreset(preset: ColorPreset): void {
  builtinPresets[preset.name]=preset;
}

/** Resolve a preset by name or return the preset object directly. */
function resolvePreset(preset: ColorPreset|string): ColorPreset|undefined {
  if(typeof preset==='string') return builtinPresets[preset];
  return preset;
}

/** Get all available color presets (built-in + registered). */
export function getColorPresets(): ColorPreset[] {
  return Object.values(builtinPresets);
}

export interface ThemeConfig {
  /** Class strategy: 'standard' toggles '.dark', 'dark-first' toggles '.light' */
  strategy?: ThemeStrategy;
  /** Custom CSS variables to inject as overrides on <html> */
  cssOverrides?: Record<string,string>;
  /** Whether to disable the built-in color-scheme attribute */
  disableColorScheme?: boolean;
  /** Built-in color preset name (e.g. 'indigo', 'blue') or a custom ColorPreset object */
  colorPreset?: ColorPreset|string;
  /** Layout style option: 'default' or 'clean-flat' for high-contrast flat panel design */
  layoutPreset?: 'default'|'clean-flat';
}

/** Explicit document-level values contributed by one mounted AdminApp. */
export interface ThemeOwnerOptions {
  themeConfig?: ThemeConfig;
  defaultTheme?: ThemeMode;
}

/** Opaque identity used to update or unregister a mounted theme owner. */
export type ThemeOwnerToken=symbol;

const STORAGE_KEY='svadmin-theme';
const COLOR_STORAGE_KEY='svadmin-color-theme';

interface ThemeOwnerEntry {
  token: ThemeOwnerToken;
  options: ThemeOwnerOptions;
}

let legacyThemeConfig: ThemeConfig={};
let themeConfig: ThemeConfig={};
let themeOwners: ThemeOwnerEntry[]=[];
let activePresetVars: string[]=[];
let activeCssOverrideVars: string[]=[];
let colorSelectionOverridesConfig=false;

function cloneColorPreset(preset: ColorPreset): ColorPreset {
  return {
    ...preset,
    light: { ...preset.light },
    dark: { ...preset.dark },
  };
}

function cloneThemeConfig(config: ThemeConfig={}): ThemeConfig {
  const cloned={ ...config };
  if(config.cssOverrides) cloned.cssOverrides={ ...config.cssOverrides };
  if(typeof config.colorPreset==='object') cloned.colorPreset=cloneColorPreset(config.colorPreset);
  return cloned;
}

function cloneOwnerOptions(options: ThemeOwnerOptions): ThemeOwnerOptions {
  return definedOptions({
    defaultTheme: options.defaultTheme,
    themeConfig: options.themeConfig===undefined
      ? undefined
      :cloneThemeConfig(options.themeConfig),
  });
}

function isExplicitOwner(options: ThemeOwnerOptions): boolean {
  return options.themeConfig!==undefined||options.defaultTheme!==undefined;
}

function getActiveOwner(): ThemeOwnerEntry|undefined {
  for(let index=themeOwners.length-1;index>=0;index-=1) {
    const owner=themeOwners[index];
    if(owner&&isExplicitOwner(owner.options)) return owner;
  }
  return undefined;
}

function getStorage(): Storage|undefined {
  if(typeof window==='undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function readStoredTheme(): ThemeMode|undefined {
  const stored=getStorage()?.getItem(STORAGE_KEY);
  return stored==='light'||stored==='dark'||stored==='system'? stored:undefined;
}

function readStoredColorTheme(): ColorTheme {
  const stored=getStorage()?.getItem(COLOR_STORAGE_KEY);
  return stored&&builtinPresets[stored]? stored as ColorTheme:'blue';
}

function persistSelection(key: string,value: string): void {
  const storage=getStorage();
  if(!storage||storage.getItem(key)===value) return;
  storage.setItem(key,value);
}

let selectedMode=readStoredTheme();
let mode=$state<ThemeMode>(selectedMode??'system');
const initialColorTheme=readStoredColorTheme();
let selectedColorTheme=$state<ColorTheme>(initialColorTheme);
let colorTheme=$state<ColorTheme>(initialColorTheme);

function getSystemPreference(): 'light'|'dark' {
  if(typeof window==='undefined'||typeof window.matchMedia!=='function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches? 'dark':'light';
}

function removeCssProperties(keys: string[]): void {
  if(typeof document==='undefined') return;
  const root=document.documentElement;
  for(const key of keys) root.style.removeProperty(key);
}

function clearAppliedArtifacts(): void {
  if(typeof document==='undefined') return;
  const root=document.documentElement;

  removeCssProperties(activeCssOverrideVars);
  removeCssProperties(activePresetVars);
  activeCssOverrideVars=[];
  activePresetVars=[];
  root.classList.remove('layout-clean-flat','light','dark');
  root.style.removeProperty('color-scheme');
  root.removeAttribute('data-theme');
}

function applyThemeClasses(themeMode: ThemeMode,config: ThemeConfig): void {
  if(typeof document==='undefined') return;
  const resolved=themeMode==='system'? getSystemPreference():themeMode;
  const strategy=config.strategy??'standard';
  const root=document.documentElement;

  root.classList.toggle('layout-clean-flat',config.layoutPreset==='clean-flat');
  if(strategy==='dark-first') {
    root.classList.toggle('light',resolved==='light');
    root.classList.remove('dark');
  } else {
    root.classList.toggle('dark',resolved==='dark');
    root.classList.remove('light');
  }

  if(!config.disableColorScheme) root.style.colorScheme=resolved;
}

function applyColorPreset(preset: ColorPreset,themeMode: ThemeMode): void {
  if(typeof document==='undefined') return;
  const resolved=themeMode==='system'? getSystemPreference():themeMode;
  const variables=resolved==='dark'? preset.dark:preset.light;
  const root=document.documentElement;

  for(const [key,value] of Object.entries(variables)) {
    const cssVar=key.startsWith('--')? key:'--'+key;
    root.style.setProperty(cssVar,value);
    activePresetVars.push(cssVar);
  }
}

function applyCssOverrides(overrides: Record<string,string>): void {
  if(typeof document==='undefined') return;
  const root=document.documentElement;

  for(const [key,value] of Object.entries(overrides)) {
    const cssVar=key.startsWith('--')? key:'--'+key;
    root.style.setProperty(cssVar,value);
    activeCssOverrideVars.push(cssVar);
  }
}

function applyEffectiveTheme(): void {
  const owner=getActiveOwner();
  const nextConfig=owner
    ? cloneThemeConfig(owner.options.themeConfig)
    :cloneThemeConfig(legacyThemeConfig);
  const nextMode=selectedMode??owner?.options.defaultTheme??'system';
  const configuredPreset=!colorSelectionOverridesConfig&&nextConfig.colorPreset
    ? resolvePreset(nextConfig.colorPreset)
    :undefined;
  const preset=configuredPreset??builtinPresets[selectedColorTheme];

  themeConfig=nextConfig;
  mode=nextMode;
  colorTheme=(preset?.name??selectedColorTheme) as ColorTheme;

  if(typeof document==='undefined') return;
  clearAppliedArtifacts();
  applyThemeClasses(mode,themeConfig);
  document.documentElement.setAttribute('data-theme',colorTheme);
  if(preset) applyColorPreset(preset,mode);
  if(themeConfig.cssOverrides) applyCssOverrides(themeConfig.cssOverrides);
}

/**
 * Configure the legacy document owner. Configuration is replaced as a whole;
 * mounted explicit owners continue to take precedence until they unregister.
 */
export function configureTheme(config: ThemeConfig): void {
  legacyThemeConfig=cloneThemeConfig(config);
  colorSelectionOverridesConfig=false;
  if(!getActiveOwner()) applyEffectiveTheme();
}

/** Get current effective theme configuration. */
export function getThemeConfig(): ThemeConfig {
  return cloneThemeConfig(themeConfig);
}

/** Remove previously applied CSS overrides. */
export function clearCssOverrides(keys?: string[]): void {
  if(typeof document==='undefined') return;
  const root=document.documentElement;

  if(keys) {
    for(const key of keys) {
      const cssVar=key.startsWith('--')? key:'--'+key;
      root.style.removeProperty(cssVar);
      activeCssOverrideVars=activeCssOverrideVars.filter((activeKey) => activeKey!==cssVar);
    }
  } else {
    removeCssProperties(activeCssOverrideVars);
    activeCssOverrideVars=[];
  }
}

export function getColorThemes() {
  return Object.values(builtinPresets).map((preset) => ({
    id: preset.name as ColorTheme,
    label: preset.label,
    color: preset.color,
  }));
}

export function getTheme(): ThemeMode {
  return mode;
}

export function setTheme(newMode: ThemeMode): void {
  selectedMode=newMode;
  persistSelection(STORAGE_KEY,newMode);
  applyEffectiveTheme();
}

export function toggleTheme(): void {
  const resolved=mode==='system'? getSystemPreference():mode;
  setTheme(resolved==='dark'? 'light':'dark');
}

/** Resolved theme (always 'light' or 'dark', never 'system'). */
export function getResolvedTheme(): 'light'|'dark' {
  return mode==='system'? getSystemPreference():mode;
}

export function getColorTheme(): ColorTheme {
  return colorTheme;
}

export function setColorTheme(nextColorTheme: ColorTheme): void {
  selectedColorTheme=nextColorTheme;
  colorSelectionOverridesConfig=true;
  persistSelection(COLOR_STORAGE_KEY,nextColorTheme);
  applyEffectiveTheme();
}

/**
 * Register a browser-only document owner. Owners with omitted values remain
 * inert, allowing a mounted AdminApp to activate the same token after prop updates.
 */
export function registerThemeOwner(options: ThemeOwnerOptions): ThemeOwnerToken|undefined {
  if(typeof window==='undefined'||typeof document==='undefined') return undefined;

  const token=Symbol('svadmin-theme-owner');
  const entry={ token,options: cloneOwnerOptions(options) };
  themeOwners.push(entry);

  if(isExplicitOwner(entry.options)) {
    colorSelectionOverridesConfig=false;
    applyEffectiveTheme();
  }

  return token;
}

/** Update one mounted owner without changing its stack order. */
export function updateThemeOwner(
  token: ThemeOwnerToken|undefined,
  options: ThemeOwnerOptions,
): void {
  if(!token||typeof window==='undefined'||typeof document==='undefined') return;
  const owner=themeOwners.find((entry) => entry.token===token);
  if(!owner) return;

  const wasExplicit=isExplicitOwner(owner.options);
  owner.options=cloneOwnerOptions(options);
  if(wasExplicit||isExplicitOwner(owner.options)) {
    colorSelectionOverridesConfig=false;
    applyEffectiveTheme();
  }
}

/** Remove an owner safely regardless of its position in the stack. */
export function unregisterThemeOwner(token: ThemeOwnerToken|undefined): void {
  if(!token||typeof window==='undefined'||typeof document==='undefined') return;
  const index=themeOwners.findIndex((entry) => entry.token===token);
  if(index===-1) return;

  const [removed]=themeOwners.splice(index,1);
  if(removed&&isExplicitOwner(removed.options)) {
    colorSelectionOverridesConfig=false;
    applyEffectiveTheme();
  }
}

export function resetTheme(): void {
  selectedMode=readStoredTheme();
  selectedColorTheme=readStoredColorTheme();
  mode=selectedMode??'system';
  colorTheme=selectedColorTheme;
  legacyThemeConfig={};
  themeConfig={};
  themeOwners=[];
  colorSelectionOverridesConfig=false;
  applyEffectiveTheme();
}

if(typeof window!=='undefined'&&typeof document!=='undefined') {
  applyEffectiveTheme();

  if(typeof window.matchMedia==='function') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',() => {
      if(mode==='system') applyEffectiveTheme();
    });
  }
}
