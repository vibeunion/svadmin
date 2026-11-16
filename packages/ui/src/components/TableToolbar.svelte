<script lang="ts">
  import type { Snippet } from "svelte";
  import { RefreshCw, Columns3 } from "@lucide/svelte";
  import { definedOptions } from "@svadmin/core/options";
  import { Button } from "./ui/button/index.js";
  import ColumnSettings, { type ColumnItem, type ColumnPreset } from "./ColumnSettings.svelte";
  import FullscreenButton from "./FullscreenButton.svelte";
  import { cn } from "../utils.js";
  import { useTranslation } from "@svadmin/core/i18n";

  export interface TableToolbarProps {
    title?: string;
    description?: string;
    columns?: ColumnItem[];
    density?: "default" | "compact";
    loading?: boolean;
    storageKey?: string;
    columnPresets?: ColumnPreset[];
    fullscreenTarget?: HTMLElement | null;
    showRefresh?: boolean;
    showDensity?: boolean;
    showColumns?: boolean;
    showFullscreen?: boolean;
    onrefresh?: () => void;
    ondensitychange?: (density: "default" | "compact") => void;
    oncolumnschange?: (columns: ColumnItem[]) => void;
    actions?: Snippet;
    extra?: Snippet;
    children?: Snippet;
    class?: string;
  }

  let {
    title,
    description,
    columns = $bindable([]),
    density = $bindable("default"),
    loading = false,
    storageKey,
    columnPresets = [],
    fullscreenTarget,
    showRefresh = true,
    showDensity = true,
    showColumns = true,
    showFullscreen = true,
    onrefresh,
    ondensitychange,
    oncolumnschange,
    actions,
    extra,
    children,
    class: className = "",
  }: TableToolbarProps = $props();

  const i18n = useTranslation();

  function toggleDensity() {
    const next = density === "default" ? "compact" : "default";
    density = next;
    ondensitychange?.(next);
  }
</script>

<div
  data-svadmin-component="TableToolbar"
  class={cn("svadmin-table-toolbar flex flex-wrap items-center justify-between gap-3 py-2.5", className)}
>
  <!-- Left: Title / Description / Actions slot -->
  <div class="flex flex-wrap items-center gap-2.5 min-w-0">
    {#if title || description}
      <div class="min-w-0 pr-2">
        {#if title}<h3 class="text-sm font-semibold text-foreground truncate leading-tight">{title}</h3>{/if}
        {#if description}<p class="text-xs text-muted-foreground truncate mt-0.5">{description}</p>{/if}
      </div>
    {/if}
    {#if actions}
      {@render actions()}
    {/if}
    {#if children}
      {@render children()}
    {/if}
  </div>

  <!-- Right: Tool actions cluster (Refresh, Density, Columns, Fullscreen) -->
  <div class="flex items-center gap-1.5 shrink-0">
    {#if extra}
      {@render extra()}
    {/if}

    {#if showRefresh && onrefresh}
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8 text-muted-foreground hover:text-foreground"
        title={i18n.t("common.refresh", { defaultValue: "Refresh" })}
        aria-label={i18n.t("common.refresh", { defaultValue: "Refresh" })}
        onclick={onrefresh}
      >
        <RefreshCw class={cn("h-4 w-4", loading && "animate-spin")} />
      </Button>
    {/if}

    {#if showDensity}
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8 text-muted-foreground hover:text-foreground"
        title={density === "compact" ? i18n.t("common.standard", { defaultValue: "Standard" }) : i18n.t("common.compact", { defaultValue: "Compact" })}
        aria-label="Toggle density"
        aria-pressed={density === "compact"}
        onclick={toggleDensity}
      >
        <Columns3 class="h-4 w-4" />
      </Button>
    {/if}

    {#if showColumns && columns.length > 0}
      <ColumnSettings
        bind:columns
        presets={columnPresets}
        triggerVariant="ghost"
        triggerSize="icon"
        class="h-8 w-8"
        {...definedOptions({ storageKey, onchange: oncolumnschange })}
      />
    {/if}

    {#if showFullscreen}
      <FullscreenButton target={fullscreenTarget ?? undefined} class="h-8 w-8" />
    {/if}
  </div>
</div>
