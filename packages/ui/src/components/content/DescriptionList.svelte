<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "../../utils.js";

  export interface DescriptionItem {
    label: string;
    value: unknown;
    description?: string;
    href?: string;
    span?: number;
  }

  interface Props {
    title?: string;
    extra?: Snippet;
    items?: DescriptionItem[];
    columns?: 1 | 2 | 3 | 4;
    layout?: "vertical" | "horizontal";
    size?: "small" | "default" | "large";
    bordered?: boolean;
    class?: string;
  }

  let {
    title,
    extra,
    items = [],
    columns = 1,
    layout = "vertical",
    size = "default",
    bordered = false,
    class: className = "",
  }: Props = $props();

  const isHorizontal = $derived(layout === "horizontal");

  function spanClass(span: number | undefined): string {
    if (!span || span <= 1) return "";
    if (span >= 4) return "sm:col-span-4";
    if (span === 3) return "sm:col-span-3";
    return "sm:col-span-2";
  }

  const columnClass = $derived.by(() => {
    switch (columns) {
      case 4:
        return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
      case 3:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      case 2:
        return "grid-cols-1 sm:grid-cols-2";
      default:
        return "grid-cols-1";
    }
  });

  const sizePadding = $derived.by(() => {
    switch (size) {
      case "small":
        return "px-3 py-1.5 text-xs";
      case "large":
        return "px-5 py-3.5 text-sm sm:text-base";
      case "default":
      default:
        return "px-4 py-2.5 text-xs sm:text-sm";
    }
  });
</script>

<div class={cn("svadmin-description-list-wrapper w-full", className)}>
  {#if title || extra}
    <div class="flex items-center justify-between pb-2 mb-2" data-slot="description-list-header">
      {#if title}<h3 class="text-sm font-semibold text-foreground m-0">{title}</h3>{/if}
      {#if extra}<div class="text-xs text-muted-foreground">{@render extra()}</div>{/if}
    </div>
  {/if}
  {#if bordered}
    <div class="overflow-hidden rounded-lg border border-border bg-card text-foreground">
      <dl class={cn("grid divide-y divide-border/60 sm:divide-y-0", columnClass)}>
        {#each items as item, idx (item.label ? `${item.label}-${idx}` : idx)}
          <div
            class={cn(
              "flex flex-col border-b border-r border-border/40 last:border-b-0",
              isHorizontal ? "sm:flex-row" : "",
              spanClass(Math.min(item.span ?? 1, columns)),
            )}
          >
            <dt
              class={cn(
                "svadmin-description-list__label shrink-0 border-b sm:border-b-0 sm:border-r border-border/30 bg-muted/30",
                sizePadding,
                isHorizontal ? "sm:w-1/3" : "",
              )}
            >
              {item.label}
            </dt>
            <dd class={cn("svadmin-description-list__value bg-card", sizePadding)}>
              {#if item.href}
                <a class="text-primary underline-offset-4 hover:underline" href={item.href}>{String(item.value ?? "—")}</a>
              {:else}
                {item.value != null ? String(item.value) : "—"}
              {/if}
              {#if item.description}
                <p class="mt-0.5 text-xs font-normal text-muted-foreground">{item.description}</p>
              {/if}
            </dd>
          </div>
        {/each}
      </dl>
    </div>
  {:else}
    <dl
      class={cn(
        "grid",
        columnClass,
        size === "small" ? "gap-x-4 gap-y-3" : size === "large" ? "gap-x-8 gap-y-6" : "gap-x-6 gap-y-5",
      )}
    >
      {#each items as item, idx (item.label ? `${item.label}-${idx}` : idx)}
        <div
          class={cn(
            "min-w-0",
            isHorizontal ? "flex items-baseline gap-2" : "",
            spanClass(Math.min(item.span ?? 1, columns)),
          )}
        >
          <dt class="svadmin-description-list__label">
            {item.label}
          </dt>
          <dd class="svadmin-description-list__value">
            {#if item.href}
              <a class="text-primary underline-offset-4 hover:underline" href={item.href}>{String(item.value ?? "—")}</a>
            {:else}
              {item.value != null ? String(item.value) : "—"}
            {/if}
            {#if item.description}
              <p class="mt-1 text-xs font-normal text-muted-foreground">{item.description}</p>
            {/if}
          </dd>
        </div>
      {/each}
    </dl>
  {/if}
</div>

<style>
  .svadmin-description-list__label {
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-body);
    font-weight: 500;
    line-height: 1.5715;
  }
  .svadmin-description-list__value {
    min-width: 0;
    flex: 1;
    color: var(--foreground);
    font-size: var(--svadmin-text-body);
    font-weight: 400;
    line-height: 1.5715;
    overflow-wrap: anywhere;
  }
  div.flex > .svadmin-description-list__label { flex: none; min-width: 5rem; }
  div:not(.flex) > .svadmin-description-list__value { margin-top: 4px; }
</style>
