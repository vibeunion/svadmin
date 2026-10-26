<script lang="ts">
  import { AlertTriangle, RefreshCw } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core';
  import { Button } from './ui/button';
  import * as Alert from './ui/alert/index.js';

  const i18n = useTranslation();

  // 优先使用宿主自定义的旧词条；当该可选词条未注册时回退到核心内置词条，
  // 避免默认 UI 直接暴露原始 i18n key。
  function translatedOrFallback(key: string, fallbackKey: string): string {
    const text = i18n.t(key);
    return text === key ? i18n.t(fallbackKey) : text;
  }

  let {
    title,
    description,
    retry,
  } = $props<{
    /** Kept for host compatibility; diagnostics are never rendered by default. */
    error?: Error | null;
    title?: string;
    description?: string;
    retry?: () => void;
  }>();

  const resolvedTitle = $derived(title ?? translatedOrFallback('error.title', 'common.error'));
  const resolvedDescription = $derived(
    description ?? translatedOrFallback('error.description', 'error.internalServerErrorDescription'),
  );
  const resolvedRetryLabel = $derived(translatedOrFallback('buttons.retry', 'common.retry'));
</script>

<div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-7e3e9a76c966 svadmin-u-1100bef66e60 svadmin-u-ca6bf63030aa">
  <Alert.Root variant="destructive" class="svadmin-u-9794ab45094d svadmin-u-2eba0d65d059">
    <AlertTriangle class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e" />
    <Alert.Title>{resolvedTitle}</Alert.Title>
    <Alert.Description>
      {resolvedDescription}
    </Alert.Description>
    {#if retry}
      <div class="svadmin-u-0ab8667228fd">
        <Button variant="outline" size="sm" onclick={retry}>
          <RefreshCw class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" data-icon="inline-start" />
          {resolvedRetryLabel}
        </Button>
      </div>
    {/if}
  </Alert.Root>
</div>
