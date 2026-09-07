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
  let DOMPurify: DomPurifyLike | null = $state(null);

  onMount(() => {
    let cancelled = false;
    import("isomorphic-dompurify")
      .then((pkg) => {
        if (!cancelled) {
          const mod = pkg as unknown as { default?: DomPurifyLike; sanitize?: DomPurifyLike["sanitize"] };
          const loaded: DomPurifyLike | undefined =
            mod.default && typeof mod.default.sanitize === "function"
              ? mod.default
              : typeof mod.sanitize === "function"
                ? (mod as DomPurifyLike)
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
  <span class="svadmin-u-bfa603190748">—</span>
{:else}
  <div class="svadmin-rich-text prose prose-sm svadmin-u-2191c1456297 svadmin-u-6b189c6edadb svadmin-u-d5df4cfe422a svadmin-u-6a67a0ea1c2c svadmin-u-07604905e9d4 svadmin-u-e20c08d8d2ec svadmin-u-0e3a63222818 svadmin-u-43ea57af72e0 svadmin-u-347cd5c5691e svadmin-u-8399f46fd96c svadmin-u-08399a18ce0f svadmin-u-fa71240c566c {className}">{@html sanitizedHtml}</div>
{/if}
