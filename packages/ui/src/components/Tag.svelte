<script lang="ts">
  import type { Snippet } from "svelte";
  import X from "@lucide/svelte/icons/x";
  import { cn } from "../utils.js";
  import { badgeVariants, type BadgeVariant } from "./ui/badge/index.js";
  import { useComponentConfig } from "./ConfigProvider.svelte";

  export type TagColor =
    | "blue"
    | "green"
    | "orange"
    | "red"
    | "purple"
    | "cyan"
    | "gray"
    | "gold"
    | "lime"
    | "magenta"
    | "pinkpurple"
    | string;

  export type TagSize = "mini" | "small" | "default" | "large" | "compact";
  export type TagShape = "square" | "round";

  interface Props {
    variant?: BadgeVariant;
    color?: TagColor;
    size?: TagSize;
    shape?: TagShape;
    bordered?: boolean;
    closable?: boolean;
    checkable?: boolean;
    checked?: boolean;
    disabled?: boolean;
    closeLabel?: string;
    icon?: Snippet;
    class?: string;
    children?: Snippet;
    onclose?: (event: MouseEvent) => void;
    onchange?: (checked: boolean) => void;
  }

  let {
    variant = "secondary",
    color,
    size: sizeProp,
    shape = "square",
    bordered = true,
    closable = false,
    checkable = false,
    checked = false,
    disabled = false,
    closeLabel = "Remove tag",
    icon,
    class: className,
    children,
    onclose,
    onchange,
  }: Props = $props();

  const config = useComponentConfig();
  const size = $derived(sizeProp ?? (config.density === "compact" || config.componentSize === "sm" ? "compact" : "default"));
  const resolvedVariant = $derived(checkable && checked && variant === "secondary" ? "default" : variant);

  const presetColorClasses: Record<string, string> = {
    blue: "bg-primary/10 text-primary border-primary/20",
    green: "bg-success/10 text-success border-success/20",
    lime: "bg-success/10 text-success border-success/20",
    orange: "bg-warning/10 text-warning border-warning/20",
    gold: "bg-warning/10 text-warning border-warning/20",
    red: "bg-destructive/10 text-destructive border-destructive/20",
    magenta: "bg-destructive/10 text-destructive border-destructive/20",
    purple: "bg-accent text-accent-foreground border-border",
    pinkpurple: "bg-accent text-accent-foreground border-border",
    cyan: "bg-info/10 text-info border-info/20",
    gray: "bg-muted text-muted-foreground border-border",
  };

  const isPresetColor = $derived(Boolean(color && presetColorClasses[color]));
  const customColorStyle = $derived.by(() => {
    if (!color || isPresetColor) return undefined;
    return `background-color: color-mix(in srgb, ${color} 10%, transparent); color: ${color}; border-color: color-mix(in srgb, ${color} 25%, transparent);`;
  });

  function handleCheck(): void {
    if (disabled) return;
    onchange?.(!checked);
  }

  function handleClose(event: MouseEvent): void {
    if (disabled) return;
    onclose?.(event);
  }
</script>

<span
  class={cn(
    !color && badgeVariants({ variant: resolvedVariant }),
    color && isPresetColor && presetColorClasses[color],
    color && !isPresetColor && "border",
    !bordered && "border-transparent",
    shape === "round" && "rounded-full px-2.5",
    "svadmin-tag inline-flex items-center",
    className
  )}
  style={customColorStyle}
  class:is-disabled={disabled}
  data-slot="tag"
  data-size={size}
  data-shape={shape !== "square" ? shape : undefined}
  data-color={color}
  data-checked={checkable ? String(checked) : undefined}
>
  {#if icon}
    <span class="svadmin-tag__icon shrink-0 mr-1 flex items-center" aria-hidden="true">
      {@render icon()}
    </span>
  {/if}
  {#if checkable}
    <button
      type="button"
      class="svadmin-tag__control"
      aria-pressed={checked}
      {disabled}
      onclick={handleCheck}
    >
      {@render children?.()}
    </button>
  {:else}
    <span class="svadmin-tag__label">{@render children?.()}</span>
  {/if}
  {#if closable}
    <button
      type="button"
      class="svadmin-tag__close"
      aria-label={closeLabel}
      {disabled}
      onclick={handleClose}
    >
      <X size={12} aria-hidden="true" />
    </button>
  {/if}
</span>

<style>
  .svadmin-tag { gap: 0.25rem; max-width: 100%; min-height: 24px; padding-inline: 8px; border-radius: 2px; font-weight: 500; }
  .svadmin-tag[data-size="mini"],
  .svadmin-tag[data-size="compact"] { min-height: 20px; font-size: 0.75rem; padding-inline: 6px; }
  .svadmin-tag[data-size="small"] { min-height: 24px; font-size: 0.75rem; padding-inline: 8px; }
  .svadmin-tag[data-size="default"] { min-height: 28px; font-size: 0.8125rem; padding-inline: 8px; }
  .svadmin-tag[data-size="large"] { min-height: 32px; font-size: 0.875rem; padding-inline: 10px; }
  .svadmin-tag.is-disabled { opacity: 1; color: var(--svadmin-text-4); }
  .svadmin-tag__label { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .svadmin-tag__control,
  .svadmin-tag__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: inherit;
    cursor: pointer;
  }
  .svadmin-tag__control {
    min-width: 0;
    padding: 0;
    text-align: start;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .svadmin-tag__control:focus-visible,
  .svadmin-tag__close:focus-visible {
    outline: var(--svadmin-focus-width) solid color-mix(in oklch, var(--ring) 48%, transparent);
    outline-offset: var(--svadmin-focus-offset);
    border-radius: var(--radius-sm);
  }
  .svadmin-tag__control:disabled,
  .svadmin-tag__close:disabled { cursor: not-allowed; }
  .svadmin-tag__close {
    flex: 0 0 auto;
    width: 1rem;
    height: 1rem;
    margin-inline-end: -0.25rem;
    border-radius: var(--radius-sm);
  }
  .svadmin-tag__close:hover:not(:disabled) { background: color-mix(in srgb, currentColor 14%, transparent); }
</style>
