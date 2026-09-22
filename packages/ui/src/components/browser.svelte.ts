import { untrack } from 'svelte';

/**
 * Svelte-native browser hooks. Every hook must be called during component
 * initialisation because each one registers a scoped effect; SSR renders the
 * documented fallback and hydration corrects the value.
 */

export interface ClipboardState {
  /** True for `timeout` ms after a successful copy. */
  readonly copied: boolean;
  /** Resolves to `true` when the text reached the clipboard. */
  copy(text: string): Promise<boolean>;
}

export interface ClipboardOptions {
  /** Feedback reset delay in ms. Defaults to 1600. */
  timeout?: number;
}

export function useClipboard(options: ClipboardOptions = {}): ClipboardState {
  const timeout = options.timeout ?? 1600;
  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => () => {
    if (timer) clearTimeout(timer);
  });

  async function copy(text: string): Promise<boolean> {
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    if (!clipboard?.writeText) return false;
    try {
      await clipboard.writeText(text);
    } catch {
      return false;
    }
    copied = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      copied = false;
    }, timeout);
    return true;
  }

  return {
    get copied() {
      return copied;
    },
    copy,
  };
}

export interface LocalStorageState<T> {
  readonly value: T;
  set(next: T): void;
  remove(): void;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Reactive `localStorage` value with cross-tab synchronization. Serialization
 * failures fall back to the initial value instead of throwing.
 */
export function useLocalStorage<T>(key: string, initial: T): LocalStorageState<T> {
  let value = $state<T>(untrack(() => readStorage(key, initial)));
  let skipNextPersist = false;

  $effect(() => {
    const serialized = JSON.stringify(value);
    if (skipNextPersist) {
      skipNextPersist = false;
      return;
    }
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, serialized);
    } catch {
      // Storage may be full or blocked; keep the in-memory value.
    }
  });

  useEventListener<StorageEvent>(typeof window === 'undefined' ? null : window, 'storage', (event) => {
    if (event.key !== key || event.newValue === null) return;
    try {
      value = JSON.parse(event.newValue) as T;
    } catch {
      // Ignore malformed external writes.
    }
  });

  return {
    get value() {
      return value;
    },
    set(next: T) {
      value = next;
    },
    remove() {
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore storage access failures.
        }
      }
      if (value === initial) return;
      skipNextPersist = true;
      value = initial;
    },
  };
}

export interface DebouncedValue<T> {
  readonly value: T;
}

/** Trailing-edge debounce over a reactive getter. */
export function useDebouncedValue<T>(source: () => T, delay = 200): DebouncedValue<T> {
  let debounced = $state<T>(untrack(source));

  $effect(() => {
    const next = source();
    const timer = setTimeout(() => {
      debounced = next;
    }, Math.max(0, delay));
    return () => clearTimeout(timer);
  });

  return {
    get value() {
      return debounced;
    },
  };
}

/**
 * Runs `callback` on an interval. Return `null` (or a non-positive number) from
 * `delay` to pause without unmounting the component.
 */
export function useInterval(callback: () => void, delay: () => number | null): void {
  $effect(() => {
    const ms = delay();
    if (ms === null || !Number.isFinite(ms) || ms <= 0 || typeof window === 'undefined') return;
    const id = setInterval(callback, ms);
    return () => clearInterval(id);
  });
}

type EventTargetLike = EventTarget | (() => EventTarget | null) | null;

/** Adds a listener for the component lifetime, re-binding when `target` changes. */
export function useEventListener<E extends Event = Event>(
  target: EventTargetLike,
  type: string,
  handler: (event: E) => void,
  options?: AddEventListenerOptions | boolean,
): void {
  $effect(() => {
    const resolved = typeof target === 'function' ? target() : target;
    if (!resolved) return;
    const listener = handler as EventListener;
    resolved.addEventListener(type, listener, options);
    return () => resolved.removeEventListener(type, listener, options);
  });
}

/**
 * Fires when a pointer press happens outside `target`. Uses `composedPath()` so
 * shadow DOM boundaries behave the same as the plain `contains` fallback.
 */
export function useOnClickOutside(
  target: () => HTMLElement | null,
  handler: (event: Event) => void,
  enabled: () => boolean = () => true,
): void {
  useEventListener<PointerEvent>(() => (typeof document === 'undefined' ? null : document), 'pointerdown', (event) => {
    if (!enabled()) return;
    const node = target();
    if (!node) return;
    const targetNode = event.target;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if (path.includes(node)) return;
    if (targetNode instanceof Node && node.contains(targetNode)) return;
    handler(event);
  });
}

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  /** Minimum travel in px before a swipe is recognised. Defaults to 30. */
  threshold?: number;
}

/**
 * Recognises single-finger/mouse swipes on a target using pointer events.
 * For pinching, rotation, or multi-touch gestures, use the Svelte ecosystem
 * `svelte-gestures` package instead.
 */
export function useSwipe(target: () => HTMLElement | null, handlers: SwipeHandlers): void {
  const threshold = handlers.threshold ?? 30;

  $effect(() => {
    const node = target();
    if (!node) return;

    let start: { x: number; y: number } | null = null;

    const onDown = (event: PointerEvent): void => {
      start = { x: event.clientX, y: event.clientY };
    };
    const onUp = (event: PointerEvent): void => {
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx > 0) handlers.onSwipeRight?.();
        else handlers.onSwipeLeft?.();
      } else if (dy > 0) {
        handlers.onSwipeDown?.();
      } else {
        handlers.onSwipeUp?.();
      }
    };
    const onCancel = (): void => {
      start = null;
    };

    node.addEventListener('pointerdown', onDown);
    node.addEventListener('pointerup', onUp);
    node.addEventListener('pointercancel', onCancel);
    return () => {
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onCancel);
    };
  });
}

export interface WindowSize {
  readonly width: number;
  readonly height: number;
}

/** Reactive viewport size; reports 0 on the server. */
export function useWindowSize(): WindowSize {
  let width = $state(typeof window === 'undefined' ? 0 : window.innerWidth);
  let height = $state(typeof window === 'undefined' ? 0 : window.innerHeight);

  useEventListener(() => (typeof window === 'undefined' ? null : window), 'resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
  });

  return {
    get width() {
      return width;
    },
    get height() {
      return height;
    },
  };
}