<script lang="ts">
  import {
    useClipboard,
    useDebouncedValue,
    useEventListener,
    useInterval,
    useLocalStorage,
    useOnClickOutside,
    useSwipe,
    useWindowSize,
  } from './browser.svelte.js';

  const clipboard = useClipboard({ timeout: 100 });
  const storage = useLocalStorage('svadmin-test-key', { count: 0 });

  let raw = $state('initial');
  const debounced = useDebouncedValue(() => raw, 50);

  let intervalDelay = $state<number | null>(null);
  let ticks = $state(0);
  useInterval(() => { ticks += 1; }, () => intervalDelay);

  let events = $state(0);
  useEventListener(() => window, 'svadmin-test-event', () => { events += 1; });

  let panel = $state<HTMLElement | null>(null);
  let outside = $state(0);
  useOnClickOutside(() => panel, () => { outside += 1; });

  const size = useWindowSize();

  let swipeTarget = $state<HTMLElement | null>(null);
  let swipe = $state('none');
  useSwipe(() => swipeTarget, {
    onSwipeLeft: () => { swipe = 'left'; },
    onSwipeRight: () => { swipe = 'right'; },
    onSwipeUp: () => { swipe = 'up'; },
    onSwipeDown: () => { swipe = 'down'; },
    threshold: 20,
  });
</script>

<output aria-label="copied">{String(clipboard.copied)}</output>
<button type="button" onclick={() => clipboard.copy('hello')}>Copy</button>

<output aria-label="storage">{JSON.stringify(storage.value)}</output>
<button type="button" onclick={() => storage.set({ count: storage.value.count + 1 })}>Increment</button>
<button type="button" onclick={() => storage.remove()}>Reset storage</button>

<input aria-label="raw" bind:value={raw} />
<output aria-label="debounced">{debounced.value}</output>

<button type="button" onclick={() => { intervalDelay = 20; }}>Start interval</button>
<button type="button" onclick={() => { intervalDelay = null; }}>Stop interval</button>
<output aria-label="ticks">{ticks}</output>

<output aria-label="events">{events}</output>
<output aria-label="outside">{outside}</output>

<div bind:this={panel} data-testid="panel">panel</div>

<output aria-label="size">{`${size.width}x${size.height}`}</output>

<div bind:this={swipeTarget} data-testid="swipe" style="width: 8rem; height: 4rem;">swipe area</div>
<output aria-label="swipe">{swipe}</output>