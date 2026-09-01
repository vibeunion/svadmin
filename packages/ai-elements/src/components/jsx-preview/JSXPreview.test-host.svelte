<script lang="ts">
  import { Type } from '@sinclair/typebox';
  import {
    defineJSXPreviewComponent,
    defineJSXPreviewSnippet,
    type JSXPreviewBindings,
    type JSXPreviewSchemaProps,
  } from './parser.js';
  import JSXPreview from './JSXPreview.svelte';
  import JSXPreviewContent from './JSXPreviewContent.svelte';
  import JSXPreviewError from './JSXPreviewError.svelte';
  import TestCard from './JSXPreview.test-card.svelte';
  import TestFormCard from './JSXPreview.test-form-card.svelte';

  let {
    jsx,
    isStreaming = false,
    bindings = {},
    onerror,
    wrapInForm = false,
    onsubmit,
  }: {
    jsx: string;
    isStreaming?: boolean;
    bindings?: JSXPreviewBindings;
    onerror?: (error: Error) => void;
    wrapInForm?: boolean;
    onsubmit?: (event: SubmitEvent) => void;
  } = $props();

  const cardSchema = Type.Object({
    title: Type.Optional(Type.String()),
    count: Type.Optional(Type.Number()),
    onactivate: Type.Optional(Type.Any()),
  }, { additionalProperties: false });
  const badgeSchema = Type.Object({ tone: Type.Optional(Type.String()) }, { additionalProperties: false });
  const formCardSchema = Type.Object({ label: Type.Optional(Type.String()) }, { additionalProperties: false });
  const cardDefinition = defineJSXPreviewComponent({ component: TestCard, schema: cardSchema });
  const formCardDefinition = defineJSXPreviewComponent({ component: TestFormCard, schema: formCardSchema });
</script>

{#snippet badge({ tone = 'neutral', children }: JSXPreviewSchemaProps<typeof badgeSchema>)}
  <span data-testid="snippet-badge" data-tone={String(tone)}>{@render children?.()}</span>
{/snippet}

{#if wrapInForm}
  <form id="host-form" onsubmit={onsubmit}>
    <JSXPreview
      {jsx}
      {isStreaming}
      {bindings}
      components={{ Card: cardDefinition, Badge: defineJSXPreviewSnippet({ snippet: badge, schema: badgeSchema }), FormCard: formCardDefinition }}
      {onerror}
    >
      <JSXPreviewContent data-testid="preview-content" />
      <JSXPreviewError data-testid="preview-error" />
    </JSXPreview>
  </form>
{:else}
  <JSXPreview
    {jsx}
    {isStreaming}
    {bindings}
    components={{ Card: cardDefinition, Badge: defineJSXPreviewSnippet({ snippet: badge, schema: badgeSchema }), FormCard: formCardDefinition }}
    {onerror}
  >
    <JSXPreviewContent data-testid="preview-content" />
    <JSXPreviewError data-testid="preview-error" />
  </JSXPreview>
{/if}
