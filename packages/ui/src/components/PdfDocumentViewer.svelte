<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { Badge } from './ui/badge/index.js';
  import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Download,
    Printer,
    FileText,
    Maximize2,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface DocumentStamp {
    id: string;
    text: string;
    page: number;
    x: number; // percentage (0-100)
    y: number; // percentage (0-100)
    status?: 'approved' | 'rejected' | 'confidential' | 'reviewed';
  }

  interface Props {
    fileUrl?: string;
    fileName?: string;
    totalPages?: number;
    currentPage?: number;
    stamps?: DocumentStamp[];
    onpagechange?: (page: number) => void;
    ondownload?: () => void;
    onprint?: () => void;
    class?: string;
  }

  let {
    fileUrl = '',
    fileName = 'Contract_Document.pdf',
    totalPages = 1,
    currentPage = $bindable(1),
    stamps = [],
    onpagechange,
    ondownload,
    onprint,
    class: className = '',
  }: Props = $props();

  let zoomLevel = $state(100);
  let rotation = $state(0);
  let isFullscreen = $state(false);

  function prevPage() {
    if (currentPage > 1) {
      currentPage -= 1;
      onpagechange?.(currentPage);
    }
  }

  function nextPage() {
    if (currentPage < totalPages) {
      currentPage += 1;
      onpagechange?.(currentPage);
    }
  }

  function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 25, 250);
  }

  function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 25, 50);
  }

  function rotate() {
    rotation = (rotation + 90) % 360;
  }

  function handleDownload() {
    if (ondownload) {
      ondownload();
      return;
    }
    if (fileUrl) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = fileName;
      a.click();
    }
  }

  function handlePrint() {
    if (onprint) {
      onprint();
    } else {
      window.print();
    }
  }

  const pageStamps = $derived(
    stamps.filter((s) => s.page === currentPage)
  );

  function getStampVariant(status?: string) {
    switch (status) {
      case 'approved':
        return 'svadmin-u-4cf5af8d25d3 svadmin-u-76747e5e02ff svadmin-u-18a6e7a36f29';
      case 'rejected':
        return 'svadmin-u-c698f77c9ba5 svadmin-u-811148b13d1e svadmin-u-9d5d8b4711b4';
      case 'confidential':
        return 'svadmin-u-d9c3c520f7d5 svadmin-u-918184635b1d svadmin-u-2f960aa0c478';
      default:
        return 'svadmin-u-30f13f694038 svadmin-u-20aaf08a7ed1 svadmin-u-05f954a846d6';
    }
  }
</script>

<div
  class={cn(
    'svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-cef5b893cf23 svadmin-u-359090c2d529 svadmin-u-2cd02d11d1af svadmin-u-0fe7d7d814d0',
    isFullscreen ? 'svadmin-u-7bc555991dba svadmin-u-dff2e7481197 svadmin-u-181b286668b5 svadmin-u-14e46609fd68' : 'svadmin-u-243d62579c55',
    className
  )}
>
  <!-- Toolbar Header -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-eb6e8b881acd svadmin-u-2859c861d7de svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
    <!-- File Title -->
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-f283ea9bea0e svadmin-u-35b2f3aff60f">
      <FileText class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-20aaf08a7ed1 svadmin-u-012fbd121f37" />
      <span class="svadmin-u-f283ea9bea0e">{fileName}</span>
    </div>

    <!-- Paging Controls -->
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
      <Button
        variant="ghost"
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216"
        disabled={currentPage <= 1}
        onclick={prevPage}
        title="Previous Page"
      >
        <ChevronLeft class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
      </Button>

      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-0e65706bcccd svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-d8e0e382c67b">
        <span class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{currentPage}</span>
        <span>/</span>
        <span>{totalPages}</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216"
        disabled={currentPage >= totalPages}
        onclick={nextPage}
        title="Next Page"
      >
        <ChevronRight class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
      </Button>
    </div>

    <!-- Zoom & Rotate Actions -->
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421">
      <Button variant="ghost" size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216" onclick={zoomOut} title="Zoom Out">
        <ZoomOut class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      </Button>

      <span class="svadmin-u-0e65706bcccd svadmin-u-d058ca6de60f svadmin-u-bfa603190748 svadmin-u-e7e371071bc5 svadmin-u-ca6bf63030aa">{zoomLevel}%</span>

      <Button variant="ghost" size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216" onclick={zoomIn} title="Zoom In">
        <ZoomIn class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      </Button>

      <Button variant="ghost" size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216" onclick={rotate} title="Rotate 90°">
        <RotateCw class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-8a539c7fe216"
        onclick={() => { isFullscreen = !isFullscreen; }}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      >
        <Maximize2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
      </Button>
    </div>

    <!-- Export & Print -->
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
      <Button variant="outline" size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={handlePrint}>
        <Printer class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        Print
      </Button>

      <Button size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={handleDownload}>
        <Download class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        Download
      </Button>
    </div>
  </div>

  <!-- Document Viewport -->
  <div class="svadmin-u-36e579c0b41c svadmin-u-73fc3fb18ceb svadmin-u-b00f43c30c2b svadmin-u-0478c89a150f svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-179c0e54131c">
    <div
      class="svadmin-u-d89972fe17d6 svadmin-u-cd0ad9a56558 svadmin-u-5f22e64f2282 svadmin-u-febc34e471df svadmin-u-ca6bcd4b6f3f svadmin-u-c9ed8c5f79ae svadmin-u-eadef238231e svadmin-u-625a4c3fbeb2 svadmin-u-2cd02d11d1af"
      style={`transform: scale(${zoomLevel / 100}) rotate(${rotation}deg); transform-origin: center center; width: 595px; min-height: 842px;`}
    >
      {#if fileUrl}
        <iframe
          src={fileUrl}
          title={fileName}
          class="svadmin-u-6da6a3c3f741 svadmin-u-f24b9e2db7e8 svadmin-u-119b2aa0b8f6"
        ></iframe>
      {:else}
        <!-- Simulated Document Paper -->
        <div class="svadmin-u-16a5872ee870 svadmin-u-b3542e058833 svadmin-u-d4108abe6359">
          <div class="svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-9fcd8a13827e svadmin-u-60fbb7713999 svadmin-u-8ef2268efbbc svadmin-u-60541e1e26f8">
            <div>
              <h2 class="svadmin-u-4ee734926ff6 svadmin-u-69450ef1487e svadmin-u-1d7f28b046ad">{fileName.replace(/\.[^/.]+$/, '')}</h2>
              <p class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748">Document Sheet Reference • Page {currentPage}</p>
            </div>
            <Badge variant="outline" class="svadmin-u-0e65706bcccd svadmin-u-1dc571a3609f">P.{currentPage}</Badge>
          </div>

          <div class="svadmin-u-6ed543e2fbbb svadmin-u-bfa603190748 svadmin-u-6b189c6edadb svadmin-u-359090c2d529">
            <p>This is a rendered document preview surface. In production, provide a valid PDF / image URL via the <code>fileUrl</code> prop to stream direct binary pages.</p>
            <p>The document supports electronic stamps, digital approval watermarks, interactive zooming, rotation and multi-page flipping.</p>
          </div>

          <div class="svadmin-u-adfb03d826b8 svadmin-u-8e63407b5ceb svadmin-u-5f22e64f2282 svadmin-u-2859c861d7de svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-6f7e013d6499">
            <div class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">Terms & Conditions of Execution</div>
            <div class="svadmin-u-d058ca6de60f svadmin-u-bfa603190748">All parties acknowledge the contractual stipulations herein outlined and agreed upon via authenticated electronic signatures.</div>
          </div>
        </div>
      {/if}

      <!-- Electronic Stamp Overlays -->
      {#each pageStamps as stamp (stamp.id)}
        <div
          class={cn(
            'svadmin-u-da4dbfbc4fdc svadmin-u-145745bf5286 svadmin-u-0e17f2bd9074 svadmin-u-ec0091ee009b svadmin-u-421ac2be5045 svadmin-u-65935df577ba svadmin-u-69450ef1487e svadmin-u-359090c2d529 uppercase svadmin-u-09ace3a4d9f5 svadmin-u-438b2237b8d6 svadmin-u-2c69d147b501 svadmin-u-a4326536b8f5 svadmin-u-7f6912283f11',
            getStampVariant(stamp.status)
          )}
          style={`left: ${stamp.x}%; top: ${stamp.y}%;`}
        >
          {stamp.text}
        </div>
      {/each}
    </div>
  </div>
</div>
