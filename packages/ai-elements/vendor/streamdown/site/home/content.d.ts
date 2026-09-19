export declare const heroTitle = "Streamdown-Svelte";
export declare const heroDescription = "Streamdown-Svelte is a markdown renderer designed for streaming content from AI models. Highly interactive, customizable, and easy to use.";
export declare const installCommand = "npm i streamdown-svelte";
export declare const usageFilePath = "src/lib/ChatMessage.svelte";
export declare const demoMarkdown = "# Streamdown-Svelte\n\nStreamdown-Svelte is a **streaming-optimized** Markdown renderer for Svelte. It was designed for AI chat interfaces where content arrives token-by-token, but it works just as well for static content.\n\nMost Markdown renderers re-parse the entire document on every update. Streamdown-Svelte takes a different approach \u2014 it splits content into discrete blocks and only re-renders the block that changed. This means your UI stays fast, even when the response is hundreds of lines long.\n\n## Getting started\n\nInstall the package from npm, then drop it into your component tree. Pass markdown through the `content` prop and Streamdown-Svelte handles the rest.\n\n```svelte\nimport { Streamdown } from \"streamdown-svelte\";\n\n<Streamdown content={content} animated caret=\"block\" />\n```\n\nThe `animated` prop enables a smooth fade-in on new blocks, and `caret` renders a blinking cursor at the end of the stream \u2014 just like the one you're watching right now.\n\n## Plugin ecosystem\n\nStreamdown-Svelte ships with optional plugins for common use cases. Each one is a separate package, so you only bundle what you need.\n\n| Plugin | Package | Purpose |\n| --- | --- | --- |\n| Syntax highlighting | `@streamdown-svelte/code` | Shiki-powered code blocks |\n| Diagrams | `@streamdown-svelte/mermaid` | Mermaid diagram rendering |\n| Math | `@streamdown-svelte/math` | KaTeX math expressions |\n| CJK | `@streamdown-svelte/cjk` | CJK line-breaking rules |\n\nFor example, the quadratic formula renders beautifully: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\n## Why Streamdown-Svelte?\n\nThere are plenty of Markdown renderers out there, but most of them weren't built for streaming. Here's what makes Streamdown-Svelte different:\n\n- [x] Block-level diffing for *incremental* re-renders\n- [x] First-class support for ~~incomplete~~ partial Markdown\n- [x] Configurable caret styles and animations\n- [ ] World domination\n\n> Streamdown-Svelte is open-source and Apache-2.0 licensed. Contributions are welcome.\n";
export declare const usageCode = "<script lang=\"ts\">\nimport { Streamdown } from \"streamdown-svelte\";\nimport { code } from \"@streamdown-svelte/code\";\nimport { mermaid } from \"@streamdown-svelte/mermaid\";\nimport { math } from \"@streamdown-svelte/math\";\nimport { cjk } from \"@streamdown-svelte/cjk\";\nimport \"katex/dist/katex.min.css\";\n\nexport let content = \"\";\nexport let isStreaming = false;\n</script>\n\n<Streamdown\n  {content}\n  plugins={{ code, mermaid, math, cjk }}\n  isAnimating={isStreaming}\n/>\n";
export declare const usageMarkdown = "```svelte\n<script lang=\"ts\">\nimport { Streamdown } from \"streamdown-svelte\";\nimport { code } from \"@streamdown-svelte/code\";\nimport { mermaid } from \"@streamdown-svelte/mermaid\";\nimport { math } from \"@streamdown-svelte/math\";\nimport { cjk } from \"@streamdown-svelte/cjk\";\nimport \"katex/dist/katex.min.css\";\n\nexport let content = \"\";\nexport let isStreaming = false;\n</script>\n\n<Streamdown\n  {content}\n  plugins={{ code, mermaid, math, cjk }}\n  isAnimating={isStreaming}\n/>\n\n```";
export declare const featureCards: readonly [{
    readonly id: "typography";
    readonly title: "Typography & GFM";
    readonly description: "Built-in <a href=\"/playground\">typography</a> for headings, lists, and code blocks. <a href=\"/playground\">GitHub Flavored Markdown</a> adds tables, task lists, strikethrough, and autolinks.";
}, {
    readonly id: "streaming";
    readonly title: "Streaming experience";
    readonly description: "Built-in <a href=\"#demo\">caret indicators</a> show users content is generating. Unterminated block styling and <a href=\"#demo\">animations</a> make partial Markdown look polished while tokens are still arriving.";
}, {
    readonly id: "code";
    readonly title: "Interactive code blocks";
    readonly description: "<a href=\"/playground\">Shiki-powered</a> syntax highlighting with copy and download controls. Streamdown-Svelte supports language detection, line numbers, and custom renderers for rich fenced blocks.";
}, {
    readonly id: "plugins";
    readonly title: "Math, diagrams & CJK";
    readonly description: "LaTeX math through KaTeX, interactive Mermaid diagrams with fullscreen viewing, and <a href=\"/playground?fixture=15-composite-playground.md\">CJK support</a> for correct ideographic punctuation.";
}, {
    readonly id: "security";
    readonly title: "Security & link safety";
    readonly description: "Security hardening blocks images and links from unexpected origins. URL policy, safe HTML handling, and controlled embeds keep streamed content predictable.";
}, {
    readonly id: "customization";
    readonly title: "Fully customizable";
    readonly description: "Override any element with custom Svelte components, apply your own styles, and fine-tune behavior through plugins and configuration without forking the renderer.";
}];
export declare const benchmarkSummary: {
    readonly title: "Performance";
    readonly description: "Current workspace benchmark snapshot against the upstream Streamdown reference. These figures come from the same compare report previewed in the README.";
    readonly chart: "/benchmarks/compare-by-scenario.svg";
    readonly reportDate: "April 7, 2026";
    readonly platform: "Linux x64, Intel Core Ultra 9 285K, Node 22.22.1";
    readonly highlights: readonly [{
        readonly label: "Overall throughput";
        readonly value: "+31.8%";
        readonly detail: "Geometric mean across 31 benchmark pairs";
    }, {
        readonly label: "Head-to-head wins";
        readonly value: "19 / 31";
        readonly detail: "Local Streamdown-Svelte wins over upstream reference";
    }, {
        readonly label: "Stream render suite";
        readonly value: "+273.3%";
        readonly detail: "Fastest area, with 5 out of 5 wins";
    }];
    readonly suites: readonly [{
        readonly name: "Stream Render";
        readonly delta: "+273.3%";
        readonly record: "5 wins / 0 losses";
    }, {
        readonly name: "Table Utilities";
        readonly delta: "+34.9%";
        readonly record: "9 wins / 0 losses";
    }, {
        readonly name: "Remend Parser";
        readonly delta: "-3.3%";
        readonly record: "4 wins / 5 losses";
    }, {
        readonly name: "Parse Blocks";
        readonly delta: "-5.1%";
        readonly record: "1 win / 7 losses";
    }];
};
