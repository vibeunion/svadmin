<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Info,
    ShieldAlert,
    FileQuestion,
    ServerCrash,
  } from "@lucide/svelte";

  export type ResultStatus = "success" | "error" | "info" | "warning" | "403" | "404" | "500";

  let {
    status = "info",
    title,
    subtitle = "",
    subTitle,
    icon,
    extra,
    children,
  }: {
    status?: ResultStatus;
    title?: string | Snippet;
    subtitle?: string | Snippet;
    subTitle?: string | Snippet;
    icon?: Snippet;
    extra?: Snippet;
    children?: Snippet;
  } = $props();

  const statusIcons = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
    "403": ShieldAlert,
    "404": FileQuestion,
    "500": ServerCrash,
  } as const;

  const IconComp = $derived(statusIcons[status] ?? Info);
  const resolvedSubtitle = $derived(subTitle ?? subtitle);
</script>

<section class="svadmin-result" data-status={status}>
  <div class="svadmin-result__icon" aria-hidden="true">
    {#if icon}
      {@render icon()}
    {:else}
      <IconComp class="size-12" />
    {/if}
  </div>
  <p class="svadmin-result__status">{status}</p>
  {#if title}
    <h2 class="svadmin-result__title">
      {#if typeof title === "string"}
        {title}
      {:else}
        {@render (title as Snippet)()}
      {/if}
    </h2>
  {/if}
  {#if resolvedSubtitle}
    <p class="svadmin-result__subtitle">
      {#if typeof resolvedSubtitle === "string"}
        {resolvedSubtitle}
      {:else}
        {@render (resolvedSubtitle as Snippet)()}
      {/if}
    </p>
  {/if}
  {#if extra || children}
    <div class="svadmin-result__extra" data-slot="result-extra">
      {#if extra}
        {@render extra()}
      {:else if children}
        {@render children()}
      {/if}
    </div>
  {/if}
</section>
