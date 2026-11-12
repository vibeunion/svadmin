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
    icon,
    children,
  }: {
    status?: ResultStatus;
    title: string;
    subtitle?: string;
    icon?: Snippet;
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
  <h2 class="svadmin-result__title">{title}</h2>
  {#if subtitle}<p class="svadmin-result__subtitle">{subtitle}</p>{/if}
  {#if children}<div class="svadmin-result__extra">{@render children()}</div>{/if}
</section>
