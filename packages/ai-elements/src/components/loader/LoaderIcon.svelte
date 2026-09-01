<script module lang="ts">
  import type { SVGAttributes } from 'svelte/elements';

  export type LoaderIconProps = Omit<SVGAttributes<SVGSVGElement>, 'children'> & {
    size?: number;
  };
</script>

<script lang="ts">
  let { size = 16, ...rest }: LoaderIconProps = $props();
</script>

<svg
  {...rest}
  width={size}
  height={size}
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d="M8 0v4" />
  <path d="M8 16v-4" opacity="0.5" />
  <path d="m3.3 1.53 2.35 3.23" opacity="0.9" />
  <path d="m12.7 1.53-2.35 3.23" opacity="0.1" />
  <path d="m12.7 14.47-2.35-3.23" opacity="0.4" />
  <path d="m3.3 14.47 2.35-3.23" opacity="0.6" />
  <path d="m15.61 5.53-3.8 1.23" opacity="0.2" />
  <path d="m.39 10.47 3.81-1.23" opacity="0.7" />
  <path d="m15.61 10.47-3.8-1.23" opacity="0.3" />
  <path d="M.39 5.53 4.2 6.76" opacity="0.8" />
</svg>
