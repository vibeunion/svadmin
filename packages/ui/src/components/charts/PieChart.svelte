<script lang="ts">
  interface Slice {
    label: string;
    value: number;
    color: string;
  }

  interface Props {
    data: Slice[];
    size?: number;
    /** Donut hole ratio (0 = pie, 0.6 = donut) */
    donut?: number;
    class?: string;
  }

  let { data, size = 200, donut = 0.6, class: className = '' }: Props = $props();

  const total = $derived(data.reduce((sum, d) => sum + d.value, 0) || 1);
  const center = $derived(size / 2);
  const radius = $derived(size / 2 - 8);
  const innerRadius = $derived(radius * donut);

  function getArcPath(startAngle: number, endAngle: number, outer: number, inner: number): string {
    const startOuter = polarToCartesian(center, center, outer, endAngle);
    const endOuter = polarToCartesian(center, center, outer, startAngle);
    const startInner = polarToCartesian(center, center, inner, startAngle);
    const endInner = polarToCartesian(center, center, inner, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${outer} ${outer} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
      inner > 0 ? `L ${startInner.x} ${startInner.y}` : `L ${center} ${center}`,
      inner > 0 ? `A ${inner} ${inner} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}` : '',
      'Z',
    ].join(' ');
  }

  function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const slices = $derived.by(() => {
    let currentAngle = 0;
    return data.map(d => {
      const angle = (d.value / total) * 360;
      const slice = {
        ...d,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        percentage: ((d.value / total) * 100).toFixed(1),
      };
      currentAngle += angle;
      return slice;
    });
  });
</script>

<div class="svadmin-u-52083e7da442 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c {className}">
  <svg viewBox="0 0 {size} {size}" width={size} height={size}>
    {#each slices as slice, i (i)}
      <path
        d={getArcPath(slice.startAngle, slice.endAngle, radius, innerRadius)}
        fill={slice.color}
        class="svadmin-u-0fe7d7d814d0 svadmin-u-625a4c3fbeb2 svadmin-u-eaeb741978b7"
        stroke="var(--background)"
        stroke-width="2"
      >
        <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="{i * 0.1}s" fill="freeze" />
      </path>
    {/each}

    <!-- Center label (donut only) -->
    {#if donut > 0}
      <text x={center} y={center - 6} text-anchor="middle" fill="var(--foreground)" font-size="20" font-weight="600">
        {total.toLocaleString()}
      </text>
      <text x={center} y={center + 12} text-anchor="middle" fill="var(--muted-foreground)" font-size="11">
        Total
      </text>
    {/if}
  </svg>

  <!-- Legend -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-86843cf1e227 svadmin-u-513d5c30bf66 svadmin-u-c163b0edfdf0">
    {#each slices as slice, _i (_i)}
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568 svadmin-u-359090c2d529">
        <span class="svadmin-u-9b3d0721b628 svadmin-u-650758f4572a svadmin-u-ac204c108886" style="background-color: {slice.color};"></span>
        <span class="svadmin-u-bfa603190748">{slice.label}</span>
        <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{slice.percentage}%</span>
      </div>
    {/each}
  </div>
</div>
