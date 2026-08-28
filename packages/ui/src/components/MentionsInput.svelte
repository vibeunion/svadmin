<script lang="ts">
  import { cn } from '../utils.js';
  import { Badge } from './ui/badge/index.js';
  import { User, Hash } from '@lucide/svelte';

  export interface MentionOption {
    id: string;
    label: string;
    type?: 'user' | 'tag' | 'entity';
    avatar?: string;
    subtitle?: string;
  }

  interface Props {
    value?: string;
    placeholder?: string;
    triggers?: string[];
    users?: MentionOption[];
    tags?: MentionOption[];
    rows?: number;
    disabled?: boolean;
    onchange?: (value: string) => void;
    class?: string;
  }

  let {
    value = $bindable(''),
    placeholder = 'Type @ to mention team members, or # to link tags...',
    triggers = ['@', '#'],
    users = [],
    tags = [],
    rows = 3,
    disabled = false,
    onchange,
    class: className = '',
  }: Props = $props();

  let textareaEl: HTMLTextAreaElement | undefined = $state();
  let showDropdown = $state(false);
  let activeTrigger = $state<string | null>(null);
  let searchQuery = $state('');
  let selectedIndex = $state(0);
  let triggerIndex = $state(-1);

  const activeOptions = $derived<MentionOption[]>(
    (() => {
      const list = activeTrigger === '#' ? tags : users;
      if (!searchQuery.trim()) return list;
      return list.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
    })()
  );

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement;
    value = target.value;
    onchange?.(value);

    const cursorPos = target.selectionStart ?? 0;
    const textBeforeCursor = value.slice(0, cursorPos);

    let matchTrigger: string | null = null;
    let matchIdx = -1;

    for (const trig of triggers) {
      const idx = textBeforeCursor.lastIndexOf(trig);
      if (idx !== -1 && (idx === 0 || /\s/.test(textBeforeCursor[idx - 1]))) {
        const query = textBeforeCursor.slice(idx + 1);
        if (!/\s/.test(query)) {
          matchTrigger = trig;
          matchIdx = idx;
          searchQuery = query;
          break;
        }
      }
    }

    if (matchTrigger !== null) {
      activeTrigger = matchTrigger;
      triggerIndex = matchIdx;
      showDropdown = true;
      selectedIndex = 0;
    } else {
      showDropdown = false;
      activeTrigger = null;
    }
  }

  function insertMention(opt: MentionOption) {
    if (!textareaEl || triggerIndex === -1 || !activeTrigger) return;
    const before = value.slice(0, triggerIndex);
    const after = value.slice(textareaEl.selectionStart ?? triggerIndex);
    const mentionToken = `${activeTrigger}${opt.label} `;
    value = `${before}${mentionToken}${after}`;
    onchange?.(value);
    showDropdown = false;
    activeTrigger = null;

    setTimeout(() => {
      if (textareaEl) {
        const newPos = before.length + mentionToken.length;
        textareaEl.focus();
        textareaEl.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!showDropdown || activeOptions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % activeOptions.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + activeOptions.length) % activeOptions.length;
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (activeOptions[selectedIndex]) {
        insertMention(activeOptions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      showDropdown = false;
      activeTrigger = null;
    }
  }
</script>

<div class={cn('relative w-full text-xs', className)}>
  <textarea
    bind:this={textareaEl}
    {value}
    {placeholder}
    {rows}
    {disabled}
    class="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
    oninput={handleInput}
    onkeydown={handleKeyDown}
  ></textarea>

  {#if showDropdown && activeOptions.length > 0}
    <div
      class="absolute left-0 top-full mt-1 z-50 min-w-48 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-md p-1 animate-in fade-in-0 zoom-in-95"
    >
      <div class="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {activeTrigger === '#' ? 'Select Tag' : 'Mention Member'}
      </div>
      {#each activeOptions as opt, idx (opt.id)}
        <button
          type="button"
          class={cn(
            'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors cursor-pointer border-0',
            idx === selectedIndex ? 'bg-accent text-accent-foreground font-medium' : 'bg-transparent text-foreground hover:bg-muted/60'
          )}
          onclick={() => insertMention(opt)}
        >
          <div class="flex items-center gap-2 truncate">
            {#if activeTrigger === '#'}
              <Hash class="h-3.5 w-3.5 text-primary shrink-0" />
            {:else}
              <User class="h-3.5 w-3.5 text-primary shrink-0" />
            {/if}
            <span class="truncate">{opt.label}</span>
          </div>

          {#if opt.subtitle}
            <Badge variant="secondary" class="text-[10px] px-1 py-0">{opt.subtitle}</Badge>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
