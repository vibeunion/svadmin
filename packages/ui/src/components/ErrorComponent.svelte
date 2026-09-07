<script lang="ts">
  import { AlertTriangle, RefreshCw } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core';
  import { Button } from './ui/button';
  import * as Alert from './ui/alert/index.js';

  const i18n = useTranslation();

  let {
    error,
    title = i18n.t('error.title'),
    description = i18n.t('error.description'),
    retry,
  } = $props<{
    error?: Error | null;
    title?: string;
    description?: string;
    retry?: () => void;
  }>();
</script>

<div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-7e3e9a76c966 svadmin-u-1100bef66e60 svadmin-u-ca6bf63030aa">
  <Alert.Root variant="destructive" class="svadmin-u-9794ab45094d svadmin-u-2eba0d65d059">
    <AlertTriangle class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e" />
    <Alert.Title>{title}</Alert.Title>
    <Alert.Description>
      {error?.message || description}
    </Alert.Description>
    {#if retry}
      <div class="svadmin-u-0ab8667228fd">
        <Button variant="outline" size="sm" onclick={retry}>
          <RefreshCw class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" data-icon="inline-start" />
          {i18n.t('buttons.retry')}
        </Button>
      </div>
    {/if}
  </Alert.Root>
</div>
