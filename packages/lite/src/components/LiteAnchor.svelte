<script lang="ts">
  interface AnchorItem {
    id: string;
    label: string;
    level?: number;
  }

  interface Props {
    items: AnchorItem[];
    label?: string;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let { items, label = 'On this page', class: className = '' }: Props = $props();
</script>

<nav class="lite-anchor {className}" aria-label={label}>
  <p class="lite-anchor__title">{label}</p>
  <ul>
    {#each items as item (item.id)}
      <li style={`padding-left:${Math.max(0, (item.level ?? 1) - 1) * 12}px`}>
        <a href={`#${item.id}`}>{item.label}</a>
      </li>
    {/each}
  </ul>
</nav>

<style>
  .lite-anchor { display: block; min-width: 0; }
  .lite-anchor__title { margin: 0; color: #86909C; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .lite-anchor ul { display: block; margin: 0; padding: 0; list-style: none; }
  .lite-anchor a { display: block; padding: 4px 8px; border-left: 2px solid transparent; color: #4E5969; font-size: 13px; text-decoration: none; }
  .lite-anchor a:hover { border-left-color: #165DFF; background: #F7F8FA; color: #165DFF; }

  .lite-anchor > * + * { margin-top: 8px; }
  .lite-anchor li + li { margin-top: 4px; }
</style>
