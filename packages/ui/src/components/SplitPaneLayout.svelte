<script lang="ts">
  import { untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  interface Props {
    direction?: 'horizontal' | 'vertical';
    initialRatio?: number;
    minRatio?: number;
    maxRatio?: number;
    pane1?: Snippet;
    pane2?: Snippet;
    class?: string;
  }

  let {
    direction = 'horizontal',
    initialRatio = 0.3,
    minRatio = 0.15,
    maxRatio = 0.85,
    pane1,
    pane2,
    class: className = '',
  }: Props = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let ratio = $state(untrack(() => initialRatio));
  let isDragging = $state(false);

  function startDrag(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    isDragging = true;

    function onMove(ev: MouseEvent | TouchEvent) {
      if (!containerEl) return;
      const rect = containerEl.getBoundingClientRect();

      const clientPos =
        direction === 'horizontal'
          ? ('touches' in ev ? ev.touches[0].clientX - rect.left : ev.clientX - rect.left)
          : ('touches' in ev ? ev.touches[0].clientY - rect.top : ev.clientY - rect.top);
      const totalSize = direction === 'horizontal' ? rect.width : rect.height;

      if (totalSize > 0) {
        const calculatedRatio = Math.max(minRatio, Math.min(maxRatio, clientPos / totalSize));
        ratio = calculatedRatio;
      }
    }

    function onEnd() {
      isDragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  }
</script>

<div
  bind:this={containerEl}
  class={cn(
    'svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-6da6a3c3f741 svadmin-u-668b21aa5409 svadmin-u-82d0b7da66df svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-cef5b893cf23 svadmin-u-2cd02d11d1af svadmin-u-7f6912283f11',
    direction === 'horizontal' ? 'svadmin-u-a6e88615d742' : 'svadmin-u-8dddea0773ed',
    className
  )}
>
  <!-- Pane 1 -->
  <div
    style={direction === 'horizontal' ? `width: ${ratio * 100}%;` : `height: ${ratio * 100}%;`}
    class="svadmin-u-73fc3fb18ceb svadmin-u-012fbd121f37 svadmin-u-6a31d3b03df0 svadmin-u-8e63407b5ceb"
  >
    {#if pane1}
      {@render pane1()}
    {/if}
  </div>

  <!-- Resizer Splitter -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    onmousedown={startDrag}
    ontouchstart={startDrag}
    class={cn(
      'svadmin-u-012fbd121f37 svadmin-u-a59afa8d9b9d svadmin-u-4e4cd27b0647 svadmin-u-ceb69a6b0e5f svadmin-u-236812d64c82 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-34516836730d',
      direction === 'horizontal'
        ? 'svadmin-u-c696a0890973 svadmin-u-1ee417e4637c svadmin-u-93d7370429b1'
        : 'svadmin-u-095acb275581 svadmin-u-b9e5bb3c1a40 svadmin-u-27de9a7feebf',
      isDragging ? 'svadmin-u-75b1bec3ea0e svadmin-u-940924b6e2d9' : ''
    )}
  >
    <div
      class={cn(
        'svadmin-u-ac204c108886 svadmin-u-dccfb8555c84',
        direction === 'horizontal' ? 'svadmin-u-f6fe902450dc svadmin-u-31d2902b53fb' : 'svadmin-u-7ec10f86d9b1 svadmin-u-10db0d558201'
      )}
    ></div>
  </div>

  <!-- Pane 2 -->
  <div
    style={direction === 'horizontal' ? `width: ${(1 - ratio) * 100}%;` : `height: ${(1 - ratio) * 100}%;`}
    class="svadmin-u-73fc3fb18ceb svadmin-u-36e579c0b41c svadmin-u-6a31d3b03df0 svadmin-u-8e63407b5ceb"
  >
    {#if pane2}
      {@render pane2()}
    {/if}
  </div>
</div>
