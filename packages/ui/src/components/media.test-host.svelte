<script lang="ts">
  import { useDeviceDetect, useMediaQuery } from './media.svelte.js';

  const wide = useMediaQuery('(min-width: 1000px)');
  const device = useDeviceDetect();
</script>

<output aria-label="wide">{String(wide.matches)}</output>
<output aria-label="mobile">{String(device.isMobile)}</output>
<output aria-label="tablet">{String(device.isTablet)}</output>
<output aria-label="desktop">{String(device.isDesktop)}</output>
<output aria-label="touch">{String(device.isTouch)}</output>