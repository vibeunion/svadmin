<script lang="ts">
  import { onDestroy } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';

  interface Props {
    dirty: boolean;
    message?: string;
  }

  let { dirty, message }: Props = $props();

  const i18n = useTranslation();
  const promptMessage = $derived(
    message ?? i18n.t('common.warnUnsavedChanges', { defaultValue: 'You have unsaved changes. Are you sure you want to leave?' })
  );

  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (dirty) {
      e.preventDefault();
      e.returnValue = promptMessage;
      return promptMessage;
    }
  }

  $effect(() => {
    if (typeof window === 'undefined') return;

    if (dirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    } else {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  });
</script>
