<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    count: number;
    label?: string;
    id?: string;
    /** Zero-based slide rendered as current (matches the reference `index`). */
    index?: number;
    /** Caller class merged with the built-in class list. */
    class?: string;
    children?: Snippet<[number]>;
  }

  let {
    count,
    label = 'Carousel',
    id = 'lite-carousel',
    index = 0,
    class: className = '',
    children,
  }: Props = $props();

  const current = $derived(count > 0 ? Math.min(Math.max(0, Math.trunc(index)), count - 1) : 0);
</script>

<section
  class={`lite-carousel ${className}`.trim()}
  aria-label={label}
  aria-roledescription="carousel"
  data-current={current + 1}
>
  <div class="lite-carousel__track">
    {#each Array.from({ length: Math.max(0, count) }, (_, index) => index) as index (index)}
      <div
        class="lite-carousel__slide"
        id={`${id}-${index + 1}`}
        role="group"
        aria-roledescription="slide"
        aria-label={`${index + 1} / ${count}`}
        data-current={index === current || undefined}
      >
        {#if children}{@render children(index)}{:else}<p class="lite-muted">Slide {index + 1}</p>{/if}
      </div>
    {/each}
  </div>
  {#if count > 1}
    <nav class="lite-carousel__dots" aria-label="Slides">
      {#each Array.from({ length: count }, (_, index) => index) as index (index)}
        <a
          href={`#${id}-${index + 1}`}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === current ? 'true' : undefined}
          class={index === current ? 'active' : undefined}
        >{index + 1}</a>
      {/each}
    </nav>
  {/if}
</section>

<style>
  .lite-carousel { display: block; }
  .lite-carousel__track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; border: 1px solid #E5E6EB; border-radius: 8px; background: #fff; }
  .lite-carousel__slide { flex: 0 0 100%; min-width: 0; padding: 16px; scroll-snap-align: start; }
  .lite-carousel__dots { display: flex; flex-wrap: wrap; justify-content: center; }
  .lite-carousel__dots a { display: inline-grid; place-items: center; min-width: 24px; height: 24px; border: 1px solid #E5E6EB; border-radius: 999px; color: #4E5969; font-size: 11px; text-decoration: none; }
  .lite-carousel__dots a:hover { border-color: #165DFF; color: #165DFF; text-decoration: none; }
  .lite-carousel__dots a.active { border-color: #165DFF; background: #E8F3FF; color: #165DFF; }

  .lite-carousel__dots a + a { margin-left: 4px; }
  .lite-carousel__track { margin-bottom: 8px; }
</style>
