<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '../ui/card/index.js';
  import { Button } from '../ui/button/index.js';
  import { Switch } from '../ui/switch/index.js';
  import { Label } from '../ui/label/index.js';
  import { Upload, Download, FileText, CheckCircle2, Loader2 } from '@lucide/svelte';

  const i18n = useTranslation();

  let isDragging = $state(false);
  let fileName = $state('');
  let importState = $state<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  let progress = $state(0);
  let importCount = $state(0);

  const importOptions = [
    { key: 'account.importCreateUsers', checked: true },
    { key: 'account.importUpdateUsers', checked: false },
    { key: 'account.importNotifyPassword', checked: false },
    { key: 'account.importExternalIds', checked: false },
    { key: 'account.importWelcomeEmail', checked: true },
  ];
  let optionStates = $state<boolean[]>(importOptions.map(o => o.checked));

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }

  function handleFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) processFile(file);
  }

  function processFile(file: File) {
    fileName = file.name;
    importState = 'uploading';
    progress = 0;

    // Simulate upload
    const interval = setInterval(() => {
      progress += 10;
      if (progress >= 100) {
        clearInterval(interval);
        importState = 'processing';
        // Simulate processing
        setTimeout(() => {
          importCount = Math.floor(Math.random() * 50) + 20;
          importState = 'complete';
        }, 1500);
      }
    }, 200);
  }

  function resetImport() {
    fileName = '';
    importState = 'idle';
    progress = 0;
    importCount = 0;
  }
</script>

<div class="space-y-6" data-svadmin-content-page="account">
  <div>
    <h2 class="text-xl font-semibold text-foreground">{i18n.t('account.importMembers')}</h2>
    <p class="mt-1 text-sm text-muted-foreground">{i18n.t('account.importMembersDescription')}</p>
  </div>

  {#if importState === 'complete'}
    <Card.Card class="border-success/30 bg-success/5">
      <Card.CardContent class="flex flex-col items-center gap-4 p-8">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
          <CheckCircle2 class="h-7 w-7" />
        </div>
        <div class="text-center">
          <h3 class="text-lg font-semibold text-success">{i18n.t('account.importComplete')}</h3>
          <p class="text-sm text-success/70 mt-1">{i18n.t('account.imported', { count: importCount })}</p>
        </div>
        <Button variant="outline" onclick={resetImport}>{i18n.t('common.back')}</Button>
      </Card.CardContent>
    </Card.Card>
  {:else}
    <!-- Upload area -->
    <Card.Card class="border-border/60">
      <Card.CardContent class="p-6">
        <label
          for="file-input"
          class="block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors
            {isDragging ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40'}"
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}
        >
          {#if importState === 'idle'}
            <Upload class="mx-auto h-10 w-10 text-muted-foreground" />
            <p class="mt-3 text-sm font-medium text-foreground">{i18n.t('account.dragOrClick')}</p>
            <p class="mt-1 text-xs text-muted-foreground">{i18n.t('account.supportedFormats')}</p>
            <div class="mt-4">
              <span class="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground">
                {i18n.t('common.upload')}
              </span>
              <input id="file-input" type="file" accept=".csv,.xlsx" class="sr-only" onchange={handleFileSelect} />
            </div>
          {:else if importState === 'uploading' || importState === 'processing'}
            <div class="space-y-3">
              <div class="flex items-center justify-center gap-2 text-sm">
                {#if importState === 'processing'}
                  <Loader2 class="h-4 w-4 animate-spin" />
                {:else}
                  <FileText class="h-4 w-4 text-muted-foreground" />
                {/if}
                <span class="font-medium">{fileName}</span>
              </div>
              <div class="h-2 w-48 mx-auto rounded-full bg-muted overflow-hidden">
                <div class="h-full rounded-full bg-primary transition-all duration-300" style="width: {progress}%"></div>
              </div>
              <p class="text-xs text-muted-foreground">
                {importState === 'uploading' ? i18n.t('account.importProgress') : i18n.t('account.startImport')}...
              </p>
            </div>
          {/if}
        </label>
      </Card.CardContent>
    </Card.Card>

    <!-- Template download -->
    <Card.Card class="border-border/60">
      <Card.CardContent class="flex items-center justify-between p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText class="h-4 w-4" />
          </div>
          <div>
            <p class="text-sm font-medium text-foreground">{i18n.t('account.downloadTemplate')}</p>
            <p class="text-xs text-muted-foreground">CSV template.csv</p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download class="h-3.5 w-3.5 mr-1" />{i18n.t('account.downloadTemplate')}
        </Button>
      </Card.CardContent>
    </Card.Card>

    <!-- Import options -->
    <Card.Card class="border-border/60">
      <Card.CardHeader>
        <Card.CardTitle class="text-base">{i18n.t('account.importOptions')}</Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent class="space-y-4">
        {#each importOptions as option, i (option.key)}
          <div class="flex items-center justify-between gap-4">
            <Label for="import-option-{i}" class="text-sm font-normal text-foreground">{i18n.t(option.key)}</Label>
            <Switch id="import-option-{i}" bind:checked={optionStates[i]} />
          </div>
        {/each}
        <div class="flex justify-end border-t pt-4">
          <Button onclick={() => { const input = document.getElementById('file-input'); input?.click(); }}>
            {i18n.t('account.startImport')}
          </Button>
        </div>
      </Card.CardContent>
    </Card.Card>
  {/if}
</div>
