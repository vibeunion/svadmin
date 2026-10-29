export type NavigationMode = 'side' | 'top' | 'mix' | 'split';
export type NavigationTheme = 'light' | 'dark' | 'system';
export type ContentWidth = 'fluid' | 'fixed' | 'wide';
export type MotionPreference = 'system' | 'reduced';

export interface UiPreferences {
  navigation: NavigationMode;
  navigationTheme: NavigationTheme;
  contentWidth: ContentWidth;
  compactDensity: boolean;
  colorWeak: boolean;
  pageTransition: boolean;
  motion: MotionPreference;
  radius: 'compact' | 'default' | 'rounded';
}

const STORAGE_KEY = 'svadmin-ui-preferences';

const defaults: UiPreferences = Object.freeze({
  navigation: 'side',
  navigationTheme: 'light',
  contentWidth: 'fixed',
  compactDensity: false,
  colorWeak: false,
  pageTransition: true,
  motion: 'system',
  radius: 'default',
});

function readPreferences(): UiPreferences {
  if (typeof window === 'undefined') return { ...defaults };
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<UiPreferences>;
    return {
      navigation: value.navigation === 'top' || value.navigation === 'mix' || value.navigation === 'split' ? value.navigation : defaults.navigation,
      navigationTheme: value.navigationTheme === 'dark' || value.navigationTheme === 'system' ? value.navigationTheme : defaults.navigationTheme,
      contentWidth: value.contentWidth === 'fluid' || value.contentWidth === 'wide' ? value.contentWidth : defaults.contentWidth,
      compactDensity: value.compactDensity === true,
      colorWeak: value.colorWeak === true,
      pageTransition: value.pageTransition !== false,
      motion: value.motion === 'reduced' ? 'reduced' : defaults.motion,
      radius: value.radius === 'compact' || value.radius === 'rounded' ? value.radius : defaults.radius,
    };
  } catch {
    return { ...defaults };
  }
}

export const uiPreferences = $state<UiPreferences>(readPreferences());

export function applyUiPreferences(target?: HTMLElement | null): void {
  if (typeof document === 'undefined') return;
  const root = target ?? document.documentElement;
  root.dataset['svadminNavigation'] = uiPreferences.navigation;
  root.dataset['svadminNavigationTheme'] = uiPreferences.navigationTheme;
  root.dataset['svadminContentWidth'] = uiPreferences.contentWidth;
  root.dataset['svadminRadius'] = uiPreferences.radius;
  root.classList.toggle('svadmin-compact-density', uiPreferences.compactDensity);
  root.classList.toggle('svadmin-color-weak', uiPreferences.colorWeak);
  root.classList.toggle('svadmin-page-transition', uiPreferences.pageTransition);
  root.classList.toggle('svadmin-reduced-motion', uiPreferences.motion === 'reduced');
}

function persist(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(uiPreferences));
  } catch {
    // Preferences remain session-local when storage is unavailable.
  }
}

export function updateUiPreferences(patch: Partial<UiPreferences>): void {
  Object.assign(uiPreferences, patch);
  applyUiPreferences();
  persist();
}

export function resetUiPreferences(): void {
  Object.assign(uiPreferences, defaults);
  applyUiPreferences();
  persist();
}

export function getUiPreferences(): UiPreferences {
  return uiPreferences;
}

applyUiPreferences();