<script lang="ts" generics="P extends Record<string, unknown>">
  import type { Component } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import type { FieldDisplayProps } from './fieldComponentMap';

  let { component: Display, resolve, input }: {
    component: Component<P>;
    resolve: (input: FieldDisplayProps) => { ok: true; props: P } | { ok: false };
    input: FieldDisplayProps;
  } = $props();

  const i18n = useTranslation();
  const result = $derived.by(() => {
    try {
      return resolve(input);
    } catch {
      // Invalid recursive values and schema failures must not reach the renderer.
      return { ok: false } as const;
    }
  });
</script>

{#if result.ok}
  <Display {...result.props} />
{:else}
  <span role="status" data-svadmin-invalid-field>{i18n.t('validation.invalidFormat')}</span>
{/if}
