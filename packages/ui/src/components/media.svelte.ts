export interface MediaQueryState {
  readonly matches: boolean;
}

export interface DeviceDetectState {
  readonly isMobile: boolean;
  readonly isTablet: boolean;
  readonly isDesktop: boolean;
  readonly isTouch: boolean;
  readonly prefersReducedMotion: boolean;
  readonly prefersDark: boolean;
}

export const MOBILE_QUERY = '(max-width: 640px)';
export const TABLET_QUERY = '(min-width: 641px) and (max-width: 1024px)';
export const TOUCH_QUERY = '(hover: none), (pointer: coarse)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Reactive `window.matchMedia`. Must be called during component initialisation
 * because it registers a scoped effect. SSR renders the fallback (no match)
 * and hydration corrects the value.
 */
export function useMediaQuery(query: string, fallback = false): MediaQueryState {
  let matches = $state(fallback);

  $effect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia(query);
    matches = mediaQuery.matches;
    const onChange = (event: MediaQueryListEvent): void => {
      matches = event.matches;
    };
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  });

  return {
    get matches() {
      return matches;
    },
  };
}

/**
 * Convenience device/preference detection built on `useMediaQuery`. Falls back
 * to the desktop, motion-enabled profile during SSR.
 */
export function useDeviceDetect(): DeviceDetectState {
  const mobile = useMediaQuery(MOBILE_QUERY);
  const tablet = useMediaQuery(TABLET_QUERY);
  const touch = useMediaQuery(TOUCH_QUERY);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const dark = useMediaQuery(DARK_QUERY);

  return {
    get isMobile() {
      return mobile.matches;
    },
    get isTablet() {
      return tablet.matches;
    },
    get isDesktop() {
      return !mobile.matches && !tablet.matches;
    },
    get isTouch() {
      return touch.matches;
    },
    get prefersReducedMotion() {
      return reducedMotion.matches;
    },
    get prefersDark() {
      return dark.matches;
    },
  };
}