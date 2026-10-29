<script lang="ts">
  let { threshold = 200, label = '回到顶部' }: { threshold?: number; label?: string } = $props();
  let visible = $state(false);

  $effect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => { visible = window.scrollY >= threshold; };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
</script>

{#if visible}
  <button type="button" class="svadmin-back-top" onclick={scrollTop}>{label}</button>
{/if}
