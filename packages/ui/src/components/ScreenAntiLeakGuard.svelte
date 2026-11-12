<script lang="ts">
  import { onMount, untrack } from 'svelte';

  export interface ScreenAntiLeakGuardProps {
    text?: string | undefined;
    subtext?: string | undefined;
    rotate?: number | undefined;
    opacity?: number | undefined;
    active?: boolean | undefined;
    autoHeal?: boolean | undefined;
    class?: string | undefined;
  }

  let {
    text = '机密数据 · 严禁拍照',
    subtext = '保密审计中 · 泄漏追责',
    rotate = -22,
    opacity = 0.08,
    active = true,
    autoHeal = true,
    class: className = '',
  }: ScreenAntiLeakGuardProps = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let isHealed = $state(false);

  // Self-healing MutationObserver
  onMount(() => {
    if (!autoHeal) return;

    let observer: MutationObserver | null = null;

    function ensureIntegrity() {
      if (!containerEl) return;
      const computed = window.getComputedStyle(containerEl);
      if (
        computed.display === 'none' ||
        computed.visibility === 'hidden' ||
        parseFloat(computed.opacity) < 0.01
      ) {
        containerEl.style.display = 'block';
        containerEl.style.visibility = 'visible';
        containerEl.style.opacity = String(untrack(() => opacity));
        isHealed = true;
      }
    }

    if (containerEl && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        ensureIntegrity();
      });

      observer.observe(containerEl, {
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden'],
      });
    }

    return () => {
      observer?.disconnect();
    };
  });
</script>

{#if active}
  <div
    bind:this={containerEl}
    class="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none transition-opacity {className}"
    style="opacity: {opacity};"
    data-svadmin-component="ScreenAntiLeakGuard"
    data-healed={isHealed}
    aria-hidden="true"
  >
    <div
      class="absolute inset-[-100%] flex flex-wrap content-start items-start justify-around"
      style="transform: rotate({rotate}deg);"
    >
      {#each Array(48) as _, idx (idx)}
        <div class="m-12 text-center text-foreground font-mono leading-tight">
          <div class="text-xs font-bold tracking-wider">{text}</div>
          {#if subtext}
            <div class="text-[10px] opacity-80 mt-0.5">{subtext}</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}
