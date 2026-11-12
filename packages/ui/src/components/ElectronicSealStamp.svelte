<script lang="ts">
  export type SealType = 'official' | 'finance' | 'contract' | 'approved' | 'rejected' | 'void';

  export interface ElectronicSealStampProps {
    companyName?: string | undefined;
    sealTitle?: string | undefined;
    serialNumber?: string | undefined;
    type?: SealType | undefined;
    dateText?: string | undefined;
    size?: 'sm' | 'md' | 'lg' | undefined;
    rotate?: number | undefined;
    class?: string | undefined;
  }

  let {
    companyName = '上海创智多租户研发网络科技有限公司',
    sealTitle = '电子审批专用章',
    serialNumber = '3101040098214',
    type = 'official',
    dateText = '2026-11-12',
    size = 'md',
    rotate = -6,
    class: className = '',
  }: ElectronicSealStampProps = $props();

  const sizePixel = $derived.by(() => {
    switch (size) {
      case 'sm': return 100;
      case 'lg': return 180;
      default: return 140;
    }
  });

  const isRejected = $derived(type === 'rejected' || type === 'void');
  const strokeColor = $derived(isRejected ? 'currentColor text-destructive' : 'currentColor text-destructive');
</script>

<div
  class="inline-block select-none pointer-events-none transition-transform opacity-90 {className}"
  style="transform: rotate({rotate}deg);"
  data-svadmin-component="ElectronicSealStamp"
  data-seal-type={type}
  aria-label="{companyName} {sealTitle}"
>
  <svg
    width={sizePixel}
    height={sizePixel}
    viewBox="0 0 200 200"
    class="{strokeColor}"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Outer Double Circular Rings -->
    <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" stroke-width="4" stroke-opacity="0.85" />
    <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.85" />

    <!-- Arc Path Definition for Top Curving Text -->
    <defs>
      <path id="seal-text-arc" d="M 22,100 A 78,78 0 1,1 178,100" fill="none" />
    </defs>

    <!-- Top Curving Company Name Text -->
    <text font-size="12" font-weight="bold" fill="currentColor" letter-spacing="1.5" text-anchor="middle">
      <textPath href="#seal-text-arc" startOffset="50%">
        {companyName}
      </textPath>
    </text>

    <!-- Center Emblem (5-point star or status word) -->
    {#if type === 'approved'}
      <rect x="50" y="80" width="100" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="2" />
      <text x="100" y="102" font-size="18" font-weight="900" fill="currentColor" text-anchor="middle">已通过</text>
    {:else if type === 'rejected'}
      <rect x="50" y="80" width="100" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="2" />
      <text x="100" y="102" font-size="18" font-weight="900" fill="currentColor" text-anchor="middle">已驳回</text>
    {:else}
      <!-- Classic 5-Point Star -->
      <polygon
        points="100,56 108,78 131,78 112,92 119,114 100,101 81,114 88,92 69,78 92,78"
        fill="currentColor"
        fill-opacity="0.85"
      />
      <!-- Seal Title underneath Star -->
      <text x="100" y="132" font-size="13" font-weight="bold" fill="currentColor" text-anchor="middle">
        {sealTitle}
      </text>
    {/if}

    <!-- Date underneath -->
    {#if dateText}
      <text x="100" y="152" font-size="10" font-family="monospace" font-weight="bold" fill="currentColor" text-anchor="middle">
        {dateText}
      </text>
    {/if}

    <!-- Bottom Serial Number -->
    {#if serialNumber}
      <text x="100" y="174" font-size="9" font-family="monospace" letter-spacing="1" fill="currentColor" text-anchor="middle">
        {serialNumber}
      </text>
    {/if}
  </svg>
</div>
