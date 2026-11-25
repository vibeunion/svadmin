<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Dialog from './ui/dialog/index.js';

  const i18n = useTranslation();

  let { open = $bindable(false) }: { open?: boolean } = $props();

  interface Shortcut {
    keys: string[];
    label: string;
  }

  const shortcuts = $derived<{ group: string; items: Shortcut[] }[]>([
    {
      group: i18n.t('shortcuts.groupNavigation'),
      items: [
        { keys: ['⌘', 'K'], label: i18n.t('shortcuts.openCommandPalette') },
        { keys: ['?'], label: i18n.t('shortcuts.showShortcuts') },
      ],
    },
    {
      group: i18n.t('shortcuts.groupTable'),
      items: [
        { keys: ['⌘', 'F'], label: i18n.t('shortcuts.focusSearch') },
        { keys: ['Esc'], label: i18n.t('shortcuts.closeDialog') },
      ],
    },
    {
      group: i18n.t('shortcuts.groupTheme'),
      items: [
        { keys: ['⌘', 'D'], label: i18n.t('shortcuts.toggleDarkMode') },
      ],
    },
  ]);
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>{i18n.t('common.keyboardShortcuts') || 'Keyboard Shortcuts'}</Dialog.Title>
    </Dialog.Header>
    <div class="space-y-4 py-2">
      {#each shortcuts as group, _i (_i)}
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{group.group}</h4>
          <div class="space-y-1.5">
            {#each group.items as shortcut, _i (_i)}
              <div class="flex items-center justify-between py-1">
                <span class="text-sm text-foreground">{shortcut.label}</span>
                <div class="flex items-center gap-1">
                  {#each shortcut.keys as key, _i (_i)}
                    <kbd class="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 text-[10px] font-medium font-mono text-muted-foreground">{key}</kbd>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </Dialog.Content>
</Dialog.Root>
