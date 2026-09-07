<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { AlertTriangle, Copy, CheckCircle } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import TooltipButton from './TooltipButton.svelte';
  import * as Card from './ui/card/index.js';

  const i18n = useTranslation();

  let { title, missingVars = [], envTemplate = '' } = $props<{
    title?: string;
    missingVars?: { key: string; description?: string }[];
    envTemplate?: string;
  }>();

  const displayTitle = $derived(title ?? i18n.t('config.missingEnvTitle'));

  let copied = $state<Record<string, boolean>>({});
  let copyTimers = $state<Record<string, ReturnType<typeof setTimeout>>>({});

  function setCopied(key: string) {
    copied = { ...copied, [key]: true };
    // Clear previous timer for this key if any
    if (copyTimers[key]) clearTimeout(copyTimers[key]);
    const timer = setTimeout(() => {
      copied = { ...copied, [key]: false };
    }, 2000);
    copyTimers = { ...copyTimers, [key]: timer };
  }

  // Cleanup all timers on destroy
  $effect(() => {
    return () => {
      Object.values(copyTimers).forEach(clearTimeout);
    };
  });

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      console.warn('[svadmin] clipboard API unavailable');
    }
  }

  async function copyAll() {
    const text = envTemplate || missingVars.map((v: { key: string }) => `${v.key}=`).join('\n');
    await copyToClipboard(text, '__all__');
  }
</script>

<div class="svadmin-u-793346c7362c svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-e6f9e383a762 svadmin-u-8e63407b5ceb">
  <div class="svadmin-u-6da6a3c3f741 svadmin-u-3698555097d6">
    <Card.Card>
      <Card.CardHeader class="svadmin-u-ca6bf63030aa svadmin-u-f4cc511ff0c1">
        <div class="svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-e7e371071bc5 svadmin-u-508ebf85b1c9 svadmin-u-5f22e64f2282 svadmin-u-43928fcc832f svadmin-u-811148b13d1e svadmin-u-0e12dc7de920 svadmin-u-1bb883263ed2">
          <AlertTriangle class="svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1" />
        </div>
        <Card.CardTitle class="svadmin-u-d5c9b0001e7e">{displayTitle}</Card.CardTitle>
        <p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">
          {i18n.t('config.missingEnvDescription')}
        </p>
      </Card.CardHeader>
      <Card.CardContent class="svadmin-u-3e7ce58d64fa">
        {#if missingVars.length > 0}
          <div class="svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-2cd02d11d1af">
            {#each missingVars as v, i (v.key)}
              <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-0e17f2bd9074 svadmin-u-e7ee55ac7ffe svadmin-u-77a2a20e90d4 {i < missingVars.length - 1 ? 'svadmin-u-65fdbade2025 svadmin-u-591f378e24a1' : ''}">
                <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-a3899220f90e svadmin-u-7e0b7cdf1a94">
                  <code class="svadmin-u-1d5904e7e755 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-0e65706bcccd">{v.key}</code>
                  {#if v.description}
                    <span class="svadmin-u-76067d04e222 svadmin-u-bfa603190748">{v.description}</span>
                  {/if}
                </div>
                <TooltipButton
                  tooltip={i18n.t('common.copy')}
                  variant="ghost"
                  size="icon"
                  class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828 svadmin-u-012fbd121f37"
                  onclick={() => copyToClipboard(`${v.key}=`, v.key)}
                >
                  {#if copied[v.key]}
                    <CheckCircle class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-76747e5e02ff" />
                  {:else}
                    <Copy class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                  {/if}
                </TooltipButton>
              </div>
            {/each}
          </div>
        {/if}

        {#if envTemplate}
          <div class="svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-2cd02d11d1af">
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-358af0b65a31 svadmin-u-65fdbade2025 svadmin-u-591f378e24a1">
              <span class="svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-bfa603190748">{i18n.t('config.envFilePath')}</span>
              <TooltipButton
                tooltip={i18n.t('common.copyAll')}
                variant="ghost"
                size="sm"
                class="svadmin-u-d0a52b312f7d svadmin-u-44ee8ba0a421"
                onclick={copyAll}
              >
                {#if copied['__all__']}
                  <CheckCircle class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-76747e5e02ff" />
                  <span class="svadmin-u-359090c2d529">{i18n.t('common.copied')}</span>
                {:else}
                  <Copy class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                  <span class="svadmin-u-359090c2d529">{i18n.t('common.copyAll')}</span>
                {/if}
              </TooltipButton>
            </div>
            <pre class="svadmin-u-0e17f2bd9074 svadmin-u-1b2d54a3fd12 svadmin-u-359090c2d529 svadmin-u-0e65706bcccd svadmin-u-6b189c6edadb svadmin-u-d4108abe6359 svadmin-u-967d113a1451 svadmin-u-74f9876a6800 svadmin-u-a2edcb1a3a6b svadmin-u-451f34ab545d">{envTemplate}</pre>
          </div>
        {/if}

        <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-ca6bf63030aa svadmin-u-0ab8667228fd">
          {i18n.t('config.reload')}
        </p>

        <Button variant="outline" class="svadmin-u-6da6a3c3f741" onclick={() => window.location.reload()}>
          {i18n.t('config.reloadButton')}
        </Button>
      </Card.CardContent>
    </Card.Card>
  </div>
</div>
