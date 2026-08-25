<script lang="ts">
  import type { Snippet, Component } from "svelte";
  import { cn, type WithElementRef } from "../utils.js";
  import * as DropdownMenu from "./ui/dropdown-menu/index.js";
  import { Button } from "./ui/button/index.js";

  export type RowActionItem = {
    label: string;
    icon?: Component<any>;
    href?: string;
    onclick?: (e: MouseEvent) => void;
    variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
    disabled?: boolean;
    title?: string;
    danger?: boolean;
    hidden?: boolean;
  };

  type Props = WithElementRef<{
    actions?: RowActionItem[];
    maxVisible?: number;
    moreLabel?: string;
    class?: string;
    children?: Snippet;
    moreContent?: Snippet;
  }>;

  let {
    actions = [],
    maxVisible = 2,
    moreLabel = "更多",
    class: className,
    children,
    moreContent,
    ...restProps
  }: Props = $props();

  const visibleActions = $derived(
    actions.filter((a) => !a.hidden).slice(0, maxVisible)
  );
  const overflowActions = $derived(
    actions.filter((a) => !a.hidden).slice(maxVisible)
  );
</script>

<div
  data-slot="row-actions"
  class={cn("inline-flex items-center gap-1.5", className)}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}

  {#each visibleActions as action}
    {#if action.href}
      <Button
        variant={action.variant || "ghost"}
        size="sm"
        href={action.href}
        disabled={action.disabled}
        title={action.title || action.label}
        class="h-8 px-2 text-xs"
      >
        {#if action.icon}
          <action.icon class="size-3.5 mr-1" />
        {/if}
        {action.label}
      </Button>
    {:else}
      <Button
        variant={action.variant || "ghost"}
        size="sm"
        onclick={action.onclick}
        disabled={action.disabled}
        title={action.title || action.label}
        class="h-8 px-2 text-xs"
      >
        {#if action.icon}
          <action.icon class="size-3.5 mr-1" />
        {/if}
        {action.label}
      </Button>
    {/if}
  {/each}

  {#if overflowActions.length > 0 || moreContent}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button
          variant="ghost"
          size="sm"
          class="h-8 px-2 text-xs"
          title={moreLabel}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
          <span class="sr-only">{moreLabel}</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="min-w-[8rem]">
        {#each overflowActions as action}
          {#if action.href}
            <a
              href={action.href}
              class="block w-full text-inherit no-underline"
            >
              <DropdownMenu.Item
                disabled={action.disabled}
                destructive={action.danger}
              >
                {#if action.icon}
                  <action.icon class="size-3.5 mr-1" />
                {/if}
                {action.label}
              </DropdownMenu.Item>
            </a>
          {:else}
            <DropdownMenu.Item
              onclick={action.onclick}
              disabled={action.disabled}
              destructive={action.danger}
            >
              {#if action.icon}
                <action.icon class="size-3.5 mr-1" />
              {/if}
              {action.label}
            </DropdownMenu.Item>
          {/if}
        {/each}
        {#if moreContent}
          {@render moreContent()}
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
</div>
