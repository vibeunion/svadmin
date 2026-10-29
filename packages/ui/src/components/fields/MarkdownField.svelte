<script lang="ts">
/* eslint-disable svelte/no-at-html-tags */
  import { onMount } from "svelte";

  interface Props {
    value?: string | null | undefined;
    class?: string;
  }

  let { value, class: className = "" }: Props = $props();

  interface DomPurifyLike {
    sanitize(source: string | Node, config?: Record<string, unknown>): string;
  }
  interface DomPurifyModule {
    default?: DomPurifyLike;
    sanitize?: DomPurifyLike["sanitize"];
  }

  function isDomPurifyModule(value: unknown): value is DomPurifyModule {
    return typeof value === 'object' && value !== null;
  }

  let DOMPurify: DomPurifyLike | null = $state(null);

  onMount(() => {
    let cancelled = false;
    import("isomorphic-dompurify")
      .then((pkg) => {
        if (!cancelled) {
          if (!isDomPurifyModule(pkg)) return;
          const loaded: DomPurifyLike | undefined =
            pkg.default && typeof pkg.default.sanitize === "function"
              ? pkg.default
              : typeof pkg.sanitize === "function"
                ? { sanitize: pkg.sanitize }
                : undefined;
          if (loaded) {
            DOMPurify = loaded;
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  });

  const sanitizedHtml = $derived.by(() => {
    if (!value) return "";
    if (DOMPurify && typeof DOMPurify.sanitize === "function") {
      return DOMPurify.sanitize(value, { USE_PROFILES: { html: true } });
    }
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  });
</script>

{#if !value}
  <span class="text-muted-foreground">—</span>
{:else}
  <div class="svadmin-rich-text prose prose-sm max-w-none leading-relaxed [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.875em] [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_a]:text-primary {className}">{@html sanitizedHtml}</div>
{/if}
