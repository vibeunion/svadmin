<script lang="ts">
/* eslint-disable svelte/no-at-html-tags */
  import { onMount } from "svelte";

  interface Props {
    /** The raw markdown string to render */
    content: string;
    /** Whether to enable streaming/typing effect styling */
    streaming?: boolean;
    /** Custom class for the container */
    class?: string;
  }

  let { content, streaming = false, class: className = "" }: Props = $props();

  type MarkedConstructor = typeof import("marked").Marked;
  type MarkedHighlight = typeof import("marked-highlight").markedHighlight;
  type HighlightApi = typeof import("highlight.js").default;
  type Sanitizer = typeof import("isomorphic-dompurify").default;

  // Lazily loaded optional peer dependencies (marked, marked-highlight,
  // highlight.js, isomorphic-dompurify). They are declared as optional peer
  // deps; statically importing them would crash consumers that have not
  // installed them, even when MarkdownRenderer is never rendered. Load them
  // dynamically so the module graph resolves without them and the component
  // degrades to escaped-text rendering when they are absent.
  let MarkedCtor = $state<MarkedConstructor | null>(null);
  let markedHighlightFn = $state<MarkedHighlight | null>(null);
  let hljs = $state<HighlightApi | null>(null);
  let DOMPurify = $state<Sanitizer | null>(null);

  onMount(() => {
    let cancelled = false;
    (async () => {
      try {
        const [markedPkg, markedHighlightPkg, hljsPkg, DOMPurifyPkg] = await Promise.all([
          import("marked"),
          import("marked-highlight"),
          import("highlight.js"),
          import("isomorphic-dompurify"),
        ]);
        if (cancelled) return;
        MarkedCtor = markedPkg.Marked;
        markedHighlightFn = markedHighlightPkg.markedHighlight;
        hljs = hljsPkg.default;
        DOMPurify = DOMPurifyPkg.default;
        // Only import the theme css when highlight.js is available
        if (hljs && Object.keys(hljs).length > 0) {
          import("highlight.js/styles/github-dark.css").catch(() => {});
        }
      } catch {
        // Optional deps not installed; fall back to escaped-text rendering.
        if (cancelled) return;
      }
    })();
    return () => { cancelled = true; };
  });

  const hasMarkdownDeps = $derived(
    typeof MarkedCtor === "function" &&
      typeof DOMPurify?.sanitize === "function" &&
      typeof markedHighlightFn === "function",
  );

  // Configure marked with syntax highlighting if available
  const markedObj = $derived.by(() => {
    const Constructor = MarkedCtor;
    const highlightExtension = markedHighlightFn;
    if (!Constructor || !highlightExtension) return null;

    return new Constructor(
      highlightExtension({
        langPrefix: "hljs language-",
        highlight(code: string, lang: string) {
          const language = hljs?.getLanguage && hljs.getLanguage(lang) ? lang : "plaintext";
          return hljs?.highlight ? hljs.highlight(code, { language }).value : code;
        },
      }),
    );
  });

  // Render HTML safely
  const html = $derived.by(() => {
    const purifier = DOMPurify;
    const parser = markedObj;
    if (hasMarkdownDeps && purifier && parser) {
      return purifier.sanitize(parser.parse(content || ""));
    }
    return `<div style="white-space: pre-wrap">${String(content || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
  });

  // Handle copy code blocks
  let copiedBlock = $state<string | null>(null);

  function handleCopy(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const button = target.closest(".copy-btn");
    if (!button) return;

    const pre = button.closest(".code-block-wrapper")?.querySelector("pre");
    if (!pre) return;

    const code = pre.textContent || "";
    navigator.clipboard.writeText(code);

    const id = Math.random().toString(36);
    copiedBlock = id;
    button.setAttribute("data-copied-id", id);
    // Swap to a semantic check icon; color comes from the .copy-btn CSS token.
    button.querySelector("svg")?.replaceWith(createCheckIcon());

    setTimeout(() => {
      if (copiedBlock === id) copiedBlock = null;
    }, 2000);
  }

  function createCheckIcon(): SVGSVGElement {
    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("lucide", "lucide-check");

    const polyline = document.createElementNS(svgNamespace, "polyline");
    polyline.setAttribute("points", "20 6 9 17 4 12");
    svg.appendChild(polyline);

    return svg;
  }

  function createCopyIcon(): SVGSVGElement {
    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("lucide", "lucide-copy");

    const rect = document.createElementNS(svgNamespace, "rect");
    rect.setAttribute("width", "14");
    rect.setAttribute("height", "14");
    rect.setAttribute("x", "8");
    rect.setAttribute("y", "8");
    rect.setAttribute("rx", "2");
    rect.setAttribute("ry", "2");
    svg.appendChild(rect);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2");
    svg.appendChild(path);

    return svg;
  }

  // Inject copy buttons into the HTML after rendering
  // We do this via action instead of raw string manipulation for safety
  function enhanceCodeBlocks(node: HTMLElement, _: string) {
    let destroyed = false;
    let enhancementScheduled = false;

    function enhance() {
      if (destroyed) return;

      // Find all pre > code blocks that don't have wrappers yet
      const pres = node.querySelectorAll("pre:not(.enhanced)");
      pres.forEach((pre) => {
        pre.classList.add("enhanced");
        const wrapper = document.createElement("div");
        wrapper.className =
          "code-block-wrapper group relative my-4 rounded-md bg-foreground/95";

        const header = document.createElement("div");
        header.className =
          "flex items-center justify-between px-4 py-2 text-xs text-background/70 border-b border-background/15";

        const lang =
          Array.from(pre.querySelector("code")?.classList || [])
            .find((className) => className.startsWith("language-"))
            ?.replace("language-", "") || "Code";
        const languageLabel = document.createElement("span");
        languageLabel.textContent = lang;

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className =
          "copy-btn hover:text-background transition-colors flex items-center gap-1";
        copyButton.setAttribute("aria-label", "Copy code");
        copyButton.appendChild(createCopyIcon());

        header.append(languageLabel, copyButton);
        pre.replaceWith(wrapper);
        wrapper.appendChild(header);

        const scrollContainer = document.createElement("div");
        scrollContainer.className = "overflow-x-auto p-4";
        scrollContainer.appendChild(pre);
        wrapper.appendChild(scrollContainer);
      });
    }

    function scheduleEnhancement() {
      if (enhancementScheduled || destroyed) return;
      enhancementScheduled = true;
      queueMicrotask(() => {
        enhancementScheduled = false;
        enhance();
      });
    }

    node.addEventListener("click", handleCopy);
    enhance();
    scheduleEnhancement();

    return {
      update(_newHtml: string) {
        scheduleEnhancement();
      },
      destroy() {
        destroyed = true;
        node.removeEventListener("click", handleCopy);
      },
    };
  }
</script>

<div 
  class="prose prose-sm dark:prose-invert max-w-none wrap-break-word {className}"
  class:streaming={streaming}
  use:enhanceCodeBlocks={html}
>
  {@html html}
</div>
