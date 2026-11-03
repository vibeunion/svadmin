<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils';

  export interface ProDescriptionItem {
    key: string;
    label: string;
    value?: unknown;
    span?: number;
    editable?: boolean;
    type?: 'text' | 'number' | 'tag' | 'badge';
    tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  }

  export interface ProDescriptionsProps {
    /** Title of the descriptions card */
    title?: string;
    /** Whether to display a border around the container and between cells (default: true) */
    bordered?: boolean;
    /** Number of columns in a row (1, 2, 3, or 4, default: 3) */
    columns?: 1 | 2 | 3 | 4;
    /** Density / size of the cells: 'small' | 'default' | 'large' (default: 'default') */
    size?: 'small' | 'default' | 'large';
    /** Layout direction of label and value: 'horizontal' | 'vertical' (default: 'horizontal') */
    layout?: 'horizontal' | 'vertical';
    /** List of description items to render */
    items?: ProDescriptionItem[];
    /** Whether inline editing is enabled globally */
    editable?: boolean;
    /** Callback triggered when a field value is saved */
    onedit?: (key: string, value: unknown) => void | Promise<void>;
    /** Extra actions slot on the top right */
    extra?: Snippet;
    /** Children slot */
    children?: Snippet;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    title,
    bordered = true,
    columns = 3,
    size = 'default',
    layout = 'horizontal',
    items = [],
    editable = false,
    onedit,
    extra,
    children,
    class: className = '',
  }: ProDescriptionsProps = $props();

  let editingKey = $state<string | null>(null);
  let editValue = $state<unknown>('');
  let isSaving = $state(false);

  function startEdit(item: ProDescriptionItem) {
    editingKey = item.key;
    editValue = item.value ?? '';
  }

  function cancelEdit() {
    editingKey = null;
    editValue = '';
  }

  async function saveEdit(key: string) {
    if (!onedit) {
      editingKey = null;
      return;
    }
    isSaving = true;
    try {
      await onedit(key, editValue);
      editingKey = null;
    } finally {
      isSaving = false;
    }
  }

  function getPaddingClass(size: 'small' | 'default' | 'large'): string {
    switch (size) {
      case 'small':
        return 'px-3 py-1.5 text-xs';
      case 'large':
        return 'px-5 py-3.5 text-sm';
      case 'default':
      default:
        return 'px-4 py-2.5 text-xs';
    }
  }

  function getTagToneClasses(tone?: ProDescriptionItem['tone']): string {
    switch (tone) {
      case 'success':
        return 'bg-success/10 text-success border-success/30';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/30';
      case 'danger':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'primary':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'neutral':
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  }

  let gridColsClass = $derived.by(() => {
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4';
      case 3:
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    }
  });
</script>

<div
  data-svadmin-component="ProDescriptions"
  class={cn(
    'svadmin-pro-descriptions rounded-[4px] bg-card text-card-foreground',
    className
  )}
>
  {#if title || extra}
    <div class="mb-3 flex items-center justify-between gap-3">
      {#if title}
        <h3 class="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h3>
      {/if}
      {#if extra}
        <div class="flex items-center gap-2">
          {@render extra()}
        </div>
      {/if}
    </div>
  {/if}

  {#if items && items.length > 0}
    <div
      class={cn(
        'grid overflow-hidden rounded-[4px]',
        bordered && 'border border-border',
        gridColsClass
      )}
    >
      {#each items as item (item.key)}
        {@const span = Math.min(item.span || 1, columns)}
        {@const isItemEditable = editable || item.editable}
        <div
          class={cn(
            'flex flex-col border-border',
            bordered && 'border-b border-r last:border-b-0',
            span === 2 && 'sm:col-span-2',
            span === 3 && 'sm:col-span-2 md:col-span-3',
            span === 4 && 'sm:col-span-2 md:col-span-4',
            layout === 'horizontal' ? 'sm:flex-row' : 'flex-col'
          )}
        >
          <!-- Label -->
          <div
            class={cn(
              'font-medium text-muted-foreground select-none',
              getPaddingClass(size),
              bordered
                ? 'bg-muted/40 border-border'
                : 'bg-transparent text-muted-foreground',
              layout === 'horizontal' ? 'sm:w-36 shrink-0 sm:border-r' : 'border-b'
            )}
          >
            {item.label}
          </div>

          <!-- Value -->
          <div
            class={cn(
              'group/cell relative flex flex-1 items-center justify-between gap-2 text-foreground',
              getPaddingClass(size),
              bordered ? 'bg-card' : 'bg-transparent'
            )}
          >
            {#if editingKey === item.key}
              <!-- Inline edit mode -->
              <div class="flex w-full items-center gap-2">
                <input
                  type={item.type === 'number' ? 'number' : 'text'}
                  bind:value={editValue}
                  class="h-7 w-full rounded-[2px] border border-primary bg-background px-2 text-xs focus:outline-none"
                  disabled={isSaving}
                  onkeydown={(e) => {
                    if (e.key === 'Enter') saveEdit(item.key);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <button
                  type="button"
                  aria-label="保存"
                  class="inline-flex h-6 w-6 items-center justify-center rounded-[2px] bg-primary text-primary-foreground hover:bg-primary/90"
                  onclick={() => saveEdit(item.key)}
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="取消"
                  class="inline-flex h-6 w-6 items-center justify-center rounded-[2px] border border-border text-muted-foreground hover:bg-muted"
                  onclick={cancelEdit}
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            {:else}
              <!-- Display mode -->
              <div class="flex items-center gap-2">
                {#if item.type === 'tag'}
                  <span
                    class={cn(
                      'inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[11px] font-medium leading-none',
                      getTagToneClasses(item.tone)
                    )}
                  >
                    {item.value ?? '-'}
                  </span>
                {:else if item.type === 'badge'}
                  <span class="inline-flex items-center gap-1.5">
                    <span
                      class={cn(
                        'h-1.5 w-1.5 rounded-full',
                        item.tone === 'success' && 'bg-success',
                        item.tone === 'warning' && 'bg-warning',
                        item.tone === 'danger' && 'bg-destructive',
                        (!item.tone || item.tone === 'primary') && 'bg-primary'
                      )}
                    ></span>
                    <span>{item.value ?? '-'}</span>
                  </span>
                {:else}
                  <span>{item.value !== undefined && item.value !== null && item.value !== '' ? item.value : '-'}</span>
                {/if}
              </div>

              {#if isItemEditable}
                <button
                  type="button"
                  aria-label={`编辑 ${item.label}`}
                  class="opacity-0 transition-opacity group-hover/cell:opacity-100 p-1 text-muted-foreground hover:text-primary"
                  onclick={() => startEdit(item)}
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </button>
              {/if}
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if children}
    {@render children()}
  {/if}
</div>
