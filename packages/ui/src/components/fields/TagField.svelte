<script module lang="ts">
  export type TagTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
</script>

<script lang="ts">
  import { Badge } from '../ui/badge/index.js';
  import { cn } from '../../utils.js';

  interface Props {
    value: string | string[] | null | undefined;
    colorMap?: Record<string, TagTone | string>;
    tone?: TagTone;
    variant?: 'secondary' | 'outline' | 'default' | 'destructive';
    size?: 'sm' | 'default';
    clickable?: boolean;
    onclick?: (tag: string) => void;
    nullLabel?: string;
    class?: string;
  }

  let {
    value,
    colorMap,
    tone,
    variant = 'secondary',
    size = 'default',
    clickable = false,
    onclick,
    nullLabel = '—',
    class: className = '',
  }: Props = $props();

  const toneClass: Record<TagTone, string> = {
    success: 'svadmin-u-18a6e7a36f29 svadmin-u-17a9f7af2265 svadmin-u-76747e5e02ff',
    warning: 'svadmin-u-2f960aa0c478 svadmin-u-283481e780bb svadmin-u-3a4ff758c2ab',
    danger: 'svadmin-u-9d5d8b4711b4 svadmin-u-43928fcc832f svadmin-u-811148b13d1e',
    info: 'svadmin-u-05f954a846d6 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1',
    neutral: 'svadmin-u-18049387f0af svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748',
  };

  const tags = $derived(
    Array.isArray(value)
      ? value.filter((t): t is string => t != null && t !== '')
      : value != null && value !== ''
        ? [String(value)]
        : []
  );

  function resolveTagClass(tag: string): string {
    const mapped = colorMap?.[tag] ?? tone;
    if (mapped && mapped in toneClass) {
      return toneClass[mapped as TagTone];
    }
    if (typeof mapped === 'string') {
      return mapped;
    }
    return '';
  }
</script>

<span class={cn('svadmin-u-52083e7da442 svadmin-u-1eb5c6df38c1 svadmin-u-44ee8ba0a421 svadmin-u-3960ffc248d9', className)}>
  {#each tags as tag, _i (_i)}
    {@const customClass = resolveTagClass(tag)}
    {#if clickable || onclick}
      <button
        type="button"
        onclick={() => onclick?.(tag)}
        class="svadmin-u-55d048ebfb1c svadmin-u-0f3af40e92e8 svadmin-u-80b9d0ae125f svadmin-u-07389a777c1f"
      >
        <Badge
          variant={customClass ? 'outline' : variant}
          class={cn(
            'svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d svadmin-u-eaeb741978b7',
            size === 'sm' ? 'svadmin-u-45d828117213 svadmin-u-68ecb30dbec6 svadmin-u-d058ca6de60f svadmin-u-cd0d9c512cdc' : '',
            customClass
          )}
        >
          {tag}
        </Badge>
      </button>
    {:else}
      <Badge
        variant={customClass ? 'outline' : variant}
        class={cn(
          size === 'sm' ? 'svadmin-u-45d828117213 svadmin-u-68ecb30dbec6 svadmin-u-d058ca6de60f svadmin-u-cd0d9c512cdc' : '',
          customClass
        )}
      >
        {tag}
      </Badge>
    {/if}
  {/each}
  {#if tags.length === 0}
    <span class="svadmin-u-bfa603190748">{nullLabel}</span>
  {/if}
</span>
