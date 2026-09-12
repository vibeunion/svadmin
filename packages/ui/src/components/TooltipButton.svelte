<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
  import * as Tooltip from './ui/tooltip/index.js';
  import { Button } from './ui/button/index.js';
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLButtonAttributes, 'class' | 'children'> {
    tooltip: string;
    href?: string;
    target?: string;
    rel?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm';
    side?: 'top' | 'right' | 'bottom' | 'left';
    class?: string;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  }

  let {
    tooltip,
    variant = 'ghost',
    size = 'icon',
    side = 'top',
    class: className = '',
    onclick,
    disabled = false,
    type = 'button',
    tabindex,
    href,
    target,
    rel,
    children,
    ...restProps
  }: Props = $props();

  let open = $state(false);

  function handleClick(event: MouseEvent, primitiveOnclick?: (event: MouseEvent) => void) {
    primitiveOnclick?.(event);
    open = false;
    onclick?.(event);
  }

  function mergeButtonProps(primitiveProps: Record<string, any>) {
    const merged: Record<string, any> = { ...primitiveProps, ...restProps };
    for (const [key, userHandler] of Object.entries(restProps)) {
      const primitiveHandler = primitiveProps[key];
      if (!key.startsWith('on') || typeof userHandler !== 'function' || typeof primitiveHandler !== 'function') continue;
      merged[key] = (event: Event) => {
        primitiveHandler(event);
        userHandler(event);
      };
    }
    return merged;
  }
</script>

<Tooltip.Root bind:open>
  <Tooltip.Trigger aria-describedby={restProps['aria-describedby']}>
    {#snippet child({ props })}
      {@const primitiveOnclick = props['onclick'] as ((event: MouseEvent) => void) | undefined}
      {@const buttonProps = { ...mergeButtonProps(props), href, target, rel, variant, size, type, class: className, 'aria-label': restProps['aria-label'] ?? tooltip, 'aria-describedby': props['aria-describedby'], onclick: (event: MouseEvent) => handleClick(event, primitiveOnclick), disabled, tabindex } as any}
      <Button {...buttonProps}>
        {@render children()}
      </Button>
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content {side}>{tooltip}</Tooltip.Content>
</Tooltip.Root>
