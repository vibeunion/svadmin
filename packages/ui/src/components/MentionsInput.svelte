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

<div class={cn('svadmin-u-d89972fe17d6 svadmin-u-6da6a3c3f741 svadmin-u-359090c2d529', className)}>
  <textarea
    bind:this={textareaEl}
    {value}
    {placeholder}
    {rows}
    {disabled}
    class="svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-e5795dad4d22 svadmin-u-e6f9e383a762 svadmin-u-9fe52d5d506c svadmin-u-359090c2d529 svadmin-u-d4108abe6359 svadmin-u-9c24ab70af61 svadmin-u-f10f771f87e9 svadmin-u-3e94a98e1466 svadmin-u-9c1295a6914a svadmin-u-5f533b3a7de7 svadmin-u-b29d8adbad2e svadmin-u-5bd7b080992c"
    oninput={handleInput}
    onkeydown={handleKeyDown}
  ></textarea>

  {#if showDropdown && activeOptions.length > 0}
    <div
      class="svadmin-u-da4dbfbc4fdc svadmin-u-c78facc7a0a6 svadmin-u-5e8a03e061f9 svadmin-u-b6b02c0ebef6 svadmin-u-181b286668b5 svadmin-u-4bdb6700d16a svadmin-u-520bb7118c41 svadmin-u-92bf82f493b1 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-e541d86d1ec8 svadmin-u-9b13e8ae5c9c svadmin-u-febc34e471df svadmin-u-eb6a3cef9686 svadmin-u-40137e897961 fade-in-0 zoom-in-95"
    >
      <div class="svadmin-u-d5eab218aa34 svadmin-u-660d2effb880 svadmin-u-1dc571a3609f svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 uppercase svadmin-u-09ace3a4d9f5">
        {activeTrigger === '#' ? 'Select Tag' : 'Mention Member'}
      </div>
      {#each activeOptions as opt, idx (opt.id)}
        <button
          type="button"
          class={cn(
            'svadmin-u-6da6a3c3f741 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-421ac2be5045 svadmin-u-2eba0d65d059 svadmin-u-359090c2d529 svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d svadmin-u-119b2aa0b8f6',
            idx === selectedIndex ? 'svadmin-u-f1669c2d7424 svadmin-u-6032d46445ba svadmin-u-2689f3958069' : 'svadmin-u-7f19cdf4c5bb svadmin-u-d4108abe6359 svadmin-u-68646cdcc246'
          )}
          onclick={() => insertMention(opt)}
        >
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-f283ea9bea0e">
            {#if activeTrigger === '#'}
              <Hash class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-20aaf08a7ed1 svadmin-u-012fbd121f37" />
            {:else}
              <User class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-20aaf08a7ed1 svadmin-u-012fbd121f37" />
            {/if}
            <span class="svadmin-u-f283ea9bea0e">{opt.label}</span>
          </div>

          {#if opt.subtitle}
            <Badge variant="secondary" class="svadmin-u-1dc571a3609f svadmin-u-d8e0e382c67b svadmin-u-68ecb30dbec6">{opt.subtitle}</Badge>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
