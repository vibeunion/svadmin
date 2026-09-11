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
    const file = e.target instanceof HTMLInputElement ? e.target.files?.[0] : undefined;
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

<div class="svadmin-u-b3542e058833" data-svadmin-content-page="account">
  <div>
    <h2 class="svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('account.importMembers')}</h2>
    <p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('account.importMembersDescription')}</p>
  </div>

  {#if importState === 'complete'}
    <Card.Card class="svadmin-u-18a6e7a36f29 svadmin-u-338625ff877e">
      <Card.CardContent class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-0c3bc98565dd svadmin-u-845f53365c8d">
        <div class="svadmin-u-60fbb7713999 svadmin-u-73a1340934c0 svadmin-u-7e74e5fe798a svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-68f2db624df7 svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff">
          <CheckCircle2 class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828" />
        </div>
        <div class="svadmin-u-ca6bf63030aa">
          <h3 class="svadmin-u-42536e69e639 svadmin-u-e83a7042bc91 svadmin-u-76747e5e02ff">{i18n.t('account.importComplete')}</h3>
          <p class="svadmin-u-fc7473ca09eb svadmin-u-083abb355258 svadmin-u-b6b02c0ebef6">{i18n.t('account.imported', { count: importCount })}</p>
        </div>
        <Button variant="outline" onclick={resetImport}>{i18n.t('common.back')}</Button>
      </Card.CardContent>
    </Card.Card>
  {:else}
    <!-- Upload area -->
    <Card.Card class="svadmin-u-05faf5c801ff">
      <Card.CardContent class="svadmin-u-0478c89a150f">
        <label
          for="file-input"
          class="svadmin-u-0214b4b355d1 svadmin-u-34516836730d svadmin-u-a217b4eaa918 svadmin-u-65935df577ba svadmin-u-a29b7a649c77 svadmin-u-845f53365c8d svadmin-u-ca6bf63030aa svadmin-u-ceb69a6b0e5f
            {isDragging ? 'svadmin-u-6cbc84dd9e1a svadmin-u-989c466fdbe7' : 'svadmin-u-05faf5c801ff svadmin-u-7d7df768f912'}"
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}
        >
          {#if importState === 'idle'}
            <Upload class="svadmin-u-0e12dc7de920 svadmin-u-426b8b75185b svadmin-u-d854e5698b57 svadmin-u-bfa603190748" />
            <p class="svadmin-u-eccd13ef4f2f svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{i18n.t('account.dragOrClick')}</p>
            <p class="svadmin-u-b6b02c0ebef6 svadmin-u-359090c2d529 svadmin-u-bfa603190748">{i18n.t('account.supportedFormats')}</p>
            <div class="svadmin-u-0ab8667228fd">
              <span class="svadmin-u-52083e7da442 svadmin-u-ed8a5df7b2fb svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-0e17f2bd9074 svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-cef5b893cf23 svadmin-u-ceb69a6b0e5f svadmin-u-0557b88819cd svadmin-u-3a99b2b8fbbe">
                {i18n.t('common.upload')}
              </span>
              <input id="file-input" type="file" accept=".csv,.xlsx" class="svadmin-u-2daa8e5e2f2e" onchange={handleFileSelect} />
            </div>
          {:else if importState === 'uploading' || importState === 'processing'}
            <div class="svadmin-u-6ed543e2fbbb">
              <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-77a2a20e90d4 svadmin-u-fc7473ca09eb">
                {#if importState === 'processing'}
                  <Loader2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-afbdd13a380e" />
                {:else}
                  <FileText class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />
                {/if}
                <span class="svadmin-u-2689f3958069">{fileName}</span>
              </div>
              <div class="svadmin-u-2f2a842e50fa svadmin-u-74b2435a1d40 svadmin-u-0e12dc7de920 svadmin-u-ac204c108886 svadmin-u-2ef11f1cb219 svadmin-u-2cd02d11d1af">
                <div class="svadmin-u-668b21aa5409 svadmin-u-ac204c108886 svadmin-u-75b1bec3ea0e svadmin-u-0fe7d7d814d0 svadmin-u-7890552ecd63" style="width: {progress}%"></div>
              </div>
              <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">
                {importState === 'uploading' ? i18n.t('account.importProgress') : i18n.t('account.startImport')}...
              </p>
            </div>
          {/if}
        </label>
      </Card.CardContent>
    </Card.Card>

    <!-- Template download -->
    <Card.Card class="svadmin-u-05faf5c801ff">
      <Card.CardContent class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-8e63407b5ceb">
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c">
          <div class="svadmin-u-60fbb7713999 svadmin-u-e7a768f922d2 svadmin-u-ae2181c7b10f svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-5f22e64f2282 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1">
            <FileText class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
          </div>
          <div>
            <p class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{i18n.t('account.downloadTemplate')}</p>
            <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">CSV template.csv</p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-618162408e7a" />{i18n.t('account.downloadTemplate')}
        </Button>
      </Card.CardContent>
    </Card.Card>

    <!-- Import options -->
    <Card.Card class="svadmin-u-05faf5c801ff">
      <Card.CardHeader>
        <Card.CardTitle class="svadmin-u-4ee734926ff6">{i18n.t('account.importOptions')}</Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent class="svadmin-u-3e7ce58d64fa">
        {#each importOptions as option, i (option.key)}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-0c3bc98565dd">
            <Label for="import-option-{i}" class="svadmin-u-fc7473ca09eb svadmin-u-8ecebc9f80e6 svadmin-u-d4108abe6359">{i18n.t(option.key)}</Label>
            <Switch id="import-option-{i}" checked={optionStates[i] ?? option.checked} onCheckedChange={(checked) => { optionStates[i] = checked; }} />          </div>
        {/each}
        <div class="svadmin-u-60fbb7713999 svadmin-u-77c08e015d14 svadmin-u-b950dda299d3 svadmin-u-173fa8f06789">
          <Button onclick={() => { const input = document.getElementById('file-input'); input?.click(); }}>
            {i18n.t('account.startImport')}
          </Button>
        </div>
      </Card.CardContent>
    </Card.Card>
  {/if}
</div>
