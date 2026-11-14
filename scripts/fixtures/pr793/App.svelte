<script lang="ts">
  import MediaGallery from '../../../packages/ui/src/components/MediaGallery.svelte';
  import HotkeysHelpModal from '../../../packages/ui/src/components/HotkeysHelpModal.svelte';
  import ResizableSplitter from '../../../packages/ui/src/components/ResizableSplitter.svelte';
  let open = $state(false);
  let allocation = $state<[number, number]>([35, 65]);
  const items = [
    { id: 'diagram', src: './diagram.svg', title: '项目结构图', size: '1.2 MB', dimensions: '1200 × 800', uploader: '设计团队' },
    { id: 'video', src: './sample.mp4', type: 'video' as const, title: '产品演示视频' },
    { id: 'audio', src: './sample.wav', type: 'audio' as const, title: '会议录音' },
    { id: 'document', src: './review.txt', type: 'document' as const, title: '评审说明文档' },
  ];
</script>
<main class="min-h-screen bg-background p-8 text-foreground">
  <header class="mb-8 flex items-start justify-between">
    <div><h1 class="text-2xl font-semibold">项目媒体工作区</h1><p class="mt-2 text-sm text-muted-foreground">媒体预览、快捷键指引与可调整分栏</p></div>
    <button class="svadmin-button" onclick={() => open = true}>查看快捷键</button>
  </header>
  <section class="mb-8 rounded-lg border border-border bg-card p-6">
    <h2 class="mb-4 text-lg font-medium">项目资料</h2>
    <MediaGallery {items} gridCols={4} watermarkText="内部评审" />
  </section>
  <section class="rounded-lg border border-border bg-card p-6">
    <div class="mb-4 flex justify-between"><h2 class="text-lg font-medium">评审工作台</h2><output aria-label="面板比例" class="text-muted-foreground">{allocation[0]}% / {allocation[1]}%</output></div>
    <div class="h-72 overflow-hidden rounded-lg border border-border">
      <ResizableSplitter initialSizes={[35, 65]} onResize={(sizes) => allocation = sizes}>
        {#snippet firstPane()}<div class="p-5"><h3 class="mb-3 font-medium">资源目录</h3><p class="text-sm text-muted-foreground">设计资料</p><p class="mt-3 text-sm text-muted-foreground">产品演示</p><p class="mt-3 text-sm text-muted-foreground">会议记录</p></div>{/snippet}
        {#snippet secondPane()}<div class="p-5"><h3 class="mb-3 font-medium">评审备注</h3><p class="text-sm text-muted-foreground">拖拽分隔线调整工作区；使用方向键、Home 和 End 精确调整比例。</p><textarea class="svadmin-textarea mt-4" aria-label="评审备注" placeholder="记录评审建议"></textarea></div>{/snippet}
      </ResizableSplitter>
    </div>
  </section>
  <HotkeysHelpModal bind:open />
</main>
