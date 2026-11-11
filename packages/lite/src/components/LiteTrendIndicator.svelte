<script lang="ts">
  type TrendDirection = 'up' | 'down' | 'neutral';
  type TrendVariant = 'text' | 'badge' | 'solid';
  type TrendSize = 'sm' | 'md' | 'lg';

  interface Props {
    value?: number | string;
    prevValue?: number;
    direction?: TrendDirection;
    prefix?: string;
    suffix?: string;
    precision?: number;
    reverseColor?: boolean;
    variant?: TrendVariant;
    size?: TrendSize;
    showIcon?: boolean;
    class?: string;
  }

  let {
    value,
    prevValue,
    direction,
    prefix,
    suffix = '%',
    precision = 1,
    reverseColor = false,
    variant = 'text',
    size = 'md',
    showIcon = true,
    class: className = '',
  }: Props = $props();

  const computed = $derived.by(() => {
    if (typeof value === 'number' && typeof prevValue === 'number' && prevValue !== 0) {
      const diff = value - prevValue;
      return {
        direction: direction ?? (diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral'),
        text: `${Math.abs((diff / Math.abs(prevValue)) * 100).toFixed(precision)}${suffix}`,
      } satisfies { direction: TrendDirection; text: string };
    }
    if (typeof value === 'number') {
      return {
        direction: direction ?? (value > 0 ? 'up' : value < 0 ? 'down' : 'neutral'),
        text: `${Math.abs(value).toFixed(precision)}${suffix}`,
      } satisfies { direction: TrendDirection; text: string };
    }
    if (typeof value === 'string') {
      const text = value.trim();
      const parsed = Number.parseFloat(text);
      const resolved = direction ?? (text.startsWith('-') || parsed < 0
        ? 'down'
        : text.startsWith('+') || parsed > 0
          ? 'up'
          : 'neutral');
      return { direction: resolved, text } satisfies { direction: TrendDirection; text: string };
    }
    return { direction: direction ?? 'neutral', text: '--' } satisfies {
      direction: TrendDirection;
      text: string;
    };
  });

  const tone = $derived.by(() => {
    if (computed.direction === 'neutral') return 'neutral';
    const improving = reverseColor ? computed.direction === 'down' : computed.direction === 'up';
    return improving ? 'positive' : 'negative';
  });
</script>

<span
  class="lite-trend lite-trend-{variant} lite-trend-{size} {className}"
  data-tone={tone}
  data-direction={computed.direction}
>
  {#if prefix}<span class="lite-trend-prefix">{prefix}</span>{/if}
  {#if showIcon}<span class="lite-trend-icon" aria-hidden="true">{computed.direction === 'up' ? '↑' : computed.direction === 'down' ? '↓' : '→'}</span>{/if}
  <span class="lite-trend-value">{computed.text}</span>
  <span class="lite-sr-only">{tone === 'positive' ? 'Improving' : tone === 'negative' ? 'Declining' : 'Unchanged'}</span>
</span>

<style>
  .lite-trend {
    display: inline-flex;
    align-items: center;
    color: #4e5969;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
    white-space: nowrap;
  }
  .lite-trend-sm { font-size: 11px; }
  .lite-trend-lg { font-size: 14px; }
  .lite-trend-badge,
  .lite-trend-solid {
    padding: 2px 6px;
    border-radius: 999px;
    border: 1px solid #e5e6eb;
    background: #f7f8fa;
  }
  .lite-trend-solid[data-tone='positive'] { color: #fff; background: #00b42a; border-color: #00b42a; }
  .lite-trend-solid[data-tone='negative'] { color: #fff; background: #f53f3f; border-color: #f53f3f; }
  .lite-trend[data-tone='positive'] { color: #00b42a; }
  .lite-trend[data-tone='negative'] { color: #f53f3f; }
  .lite-trend[data-tone='neutral'] { color: #86909c; }
  .lite-trend-prefix, .lite-trend-icon { margin-right: 4px; }
  .lite-trend-prefix { color: #86909c; font-weight: 500; }
  .lite-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
