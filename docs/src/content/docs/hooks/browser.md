---
title: Browser hooks
description: Svelte-runes browser utilities in @svadmin/ui
---

`@svadmin/ui` ships a small set of Svelte 5 runes hooks for browser concerns.
They run on the client, degrade safely during SSR, and clean up after
themselves when the component is destroyed. There is no React-style hooks
runtime and no extra dependency.

Call every hook **during component initialisation**. Each one registers a
scoped effect, so calling it later (inside a callback) will not work.

```svelte
<script lang="ts">
  import { useDebouncedValue } from '@svadmin/ui';

  let query = $state('');
  const debounced = useDebouncedValue(() => query, 300);
</script>

<input bind:value={query} />
<p>Searching for: {debounced.value}</p>
```

## Responsive and device

| Hook | Returns | Notes |
| --- | --- | --- |
| `useMediaQuery(query, fallback?)` | `{ matches }` | Reactive `window.matchMedia`; `fallback` (default `false`) is used during SSR |
| `useDeviceDetect()` | `{ isMobile, isTablet, isDesktop, isTouch, prefersReducedMotion, prefersDark }` | Built on `useMediaQuery`; defaults to the desktop, motion-enabled profile on the server |
| `useWindowSize()` | `{ width, height }` | Viewport size; reports `0` on the server |

The exported constants `MOBILE_QUERY`, `TABLET_QUERY`, `TOUCH_QUERY`,
`REDUCED_MOTION_QUERY`, and `DARK_QUERY` let hosts reuse the same breakpoints
instead of hardcoding strings.

## Clipboard and persistence

| Hook | Returns | Notes |
| --- | --- | --- |
| `useClipboard({ timeout? })` | `{ copied, copy(text) }` | `copy` resolves to `false` when the Clipboard API is unavailable or rejected; `copied` resets after `timeout` ms (default 1600) |
| `useLocalStorage(key, initial)` | `{ value, set, remove }` | JSON-serialized, cross-tab synchronized via the `storage` event; malformed external writes are ignored |

```svelte
<script lang="ts">
  import { useClipboard, useLocalStorage } from '@svadmin/ui';

  const clipboard = useClipboard();
  const draft = useLocalStorage('order-draft', { note: '' });
</script>

<button onclick={() => clipboard.copy(draft.value.note)}>
  {clipboard.copied ? 'Copied' : 'Copy note'}
</button>
```

`useLocalStorage` stores the initial value on mount. Keep keys namespaced by
user or tenant when the value is user-specific, and never store credentials or
tokens.

## Timing, events, and interaction

| Hook | Returns | Notes |
| --- | --- | --- |
| `useDebouncedValue(source, delay?)` | `{ value }` | Trailing-edge debounce over a reactive getter; default `delay` is 200 ms |
| `useInterval(callback, delay)` | `void` | `delay` is a getter; return `null` or a non-positive number to pause |
| `useEventListener(target, type, handler, options?)` | `void` | Re-binds when `target` changes; accepts an `EventTarget` or a getter |
| `useOnClickOutside(target, handler, enabled?)` | `void` | Uses `composedPath()` with a `contains` fallback; `enabled` lets a host suspend it while a popover is closing |
| `useSwipe(target, handlers)` | `void` | Recognises single-pointer swipes via `pointerdown`/`pointerup` and a configurable `threshold` (default 30); use `svelte-gestures` for pinch/rotate |

## Server rendering

All hooks are safe to import on the server. Browser-only hooks return their
documented fallback (no match, `0` size, initial storage value) during SSR and
correct themselves after hydration. Do not branch SSR output on a media query
result; render a neutral layout and enhance on the client.

## Boundaries

These hooks intentionally cover common admin needs only. Categories that need
specialized or dependency-heavy implementations are delegated to the Svelte
ecosystem instead — see [Ecosystem coverage](/guides/ecosystem-coverage/).