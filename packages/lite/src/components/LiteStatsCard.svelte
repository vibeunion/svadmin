<script lang="ts">
  /**
   * LiteStatsCard — SSR-compatible KPI statistics card.
   * Pure HTML card with number, label, and optional trend indicator.
   * No client-side JS required.
   */

  interface Props {
    /** The main number/value to display */
    value: string | number;
    /** Label/title for the stat */
    label: string;
    /** Optional description text below the label */
    description?: string;
    /** Trend direction: 'up' shows green arrow, 'down' shows red arrow */
    trend?: 'up' | 'down' | 'neutral';
    /** Trend value text (e.g. "+12%", "-3%") */
    trendValue?: string;
    /** Optional icon character or HTML entity to display */
    icon?: string;
    /** Link to detail page */
    href?: string;
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let {
    value,
    label,
    description,
    trend,
    trendValue,
    icon,
    href,
    class: className = '',
  }: Props = $props();
</script>

{#if href}
  <a href={href} class="lite-stats-card lite-card {className}" style="text-decoration:none;display:block;">
    {#if icon}
      <div class="lite-stats-icon">{icon}</div>
    {/if}
    <div class="lite-stats-value">{value}</div>
    <div class="lite-stats-label">{label}</div>
    {#if trendValue}
      <div class="lite-stats-trend lite-stats-trend-{trend || 'neutral'}">
        {#if trend === 'up'}&#9650;{:else if trend === 'down'}&#9660;{:else}&#9644;{/if}
        {trendValue}
      </div>
    {/if}
    {#if description}
      <div class="lite-stats-desc">{description}</div>
    {/if}
  </a>
{:else}
  <div class="lite-stats-card lite-card {className}">
    {#if icon}
      <div class="lite-stats-icon">{icon}</div>
    {/if}
    <div class="lite-stats-value">{value}</div>
    <div class="lite-stats-label">{label}</div>
    {#if trendValue}
      <div class="lite-stats-trend lite-stats-trend-{trend || 'neutral'}">
        {#if trend === 'up'}&#9650;{:else if trend === 'down'}&#9660;{:else}&#9644;{/if}
        {trendValue}
      </div>
    {/if}
    {#if description}
      <div class="lite-stats-desc">{description}</div>
    {/if}
  </div>
{/if}
