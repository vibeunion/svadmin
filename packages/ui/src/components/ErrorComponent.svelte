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

<div class="flex flex-col items-center justify-center px-8 py-10 text-center">
  <Alert.Root variant="destructive" class="max-w-md text-left">
    <AlertTriangle class="h-5 w-5" />
    <Alert.Title>{resolvedTitle}</Alert.Title>
    <Alert.Description>
      {resolvedDescription}
    </Alert.Description>
    {#if retry}
      <div class="mt-4">
        <Button variant="outline" size="sm" onclick={retry}>
          <RefreshCw class="h-3 w-3" data-icon="inline-start" />
          {resolvedRetryLabel}
        </Button>
      </div>
    {/if}
  </Alert.Root>
</div>
