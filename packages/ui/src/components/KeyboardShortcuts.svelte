<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Dialog from './ui/dialog/index.js';

  const i18n = useTranslation();

  let { open = $bindable(false) }: { open?: boolean } = $props();

  interface Shortcut {
    keys: string[];
    label: string;
  }

  const shortcuts: { group: string; items: Shortcut[] }[] = [
    {
      group: 'Navigation',
      items: [
        { keys: ['⌘', 'K'], label: 'Open command palette' },
        { keys: ['?'], label: 'Show keyboard shortcuts' },
      ],
    },
    {
      group: 'Table',
      items: [
        { keys: ['⌘', 'F'], label: 'Focus search' },
        { keys: ['Esc'], label: 'Close dialog / cancel' },
      ],
    },
    {
      group: 'Theme',
      items: [
        { keys: ['⌘', 'D'], label: 'Toggle dark mode' },
      ],
    },
  ];
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="svadmin-u-9794ab45094d">
    <Dialog.Header>
      <Dialog.Title>{i18n.t('common.keyboardShortcuts') || 'Keyboard Shortcuts'}</Dialog.Title>
    </Dialog.Header>
    <div class="svadmin-u-3e7ce58d64fa svadmin-u-03b4dd7f172b">
      {#each shortcuts as group, _i (_i)}
        <div>
          <h4 class="svadmin-u-359090c2d529 svadmin-u-e83a7042bc91 uppercase svadmin-u-09ace3a4d9f5 svadmin-u-bfa603190748 svadmin-u-a77ed4d908c0">{group.group}</h4>
          <div class="svadmin-u-5a2508227c6a">
            {#each group.items as shortcut, _i (_i)}
              <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-660d2effb880">
                <span class="svadmin-u-fc7473ca09eb svadmin-u-d4108abe6359">{shortcut.label}</span>
                <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421">
                  {#each shortcut.keys as key, _i (_i)}
                    <kbd class="svadmin-u-52083e7da442 svadmin-u-cd0d9c512cdc svadmin-u-f8516763aedd svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-07389a777c1f svadmin-u-ca6bcd4b6f3f svadmin-u-2ef11f1cb219 svadmin-u-45d828117213 svadmin-u-1dc571a3609f svadmin-u-2689f3958069 svadmin-u-0e65706bcccd svadmin-u-bfa603190748">{key}</kbd>
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
