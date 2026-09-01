<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { useJSXPreviewContext } from './context.svelte.js';
  import type {
    JSXPreviewElementNode,
    JSXPreviewNode,
    JSXPreviewParseResult,
  } from './parser.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> & { class?: string };
  let { class: className = '', ...rest }: Props = $props();
  const generatedId = $props.id();
  const preview = useJSXPreviewContext();
  const isolationFormId = `${generatedId}-isolated-form`;
  const formAssociatedTags = new Set(['button', 'fieldset', 'input', 'output', 'select', 'textarea']);
  const voidTags = new Set(['br', 'col', 'hr', 'img', 'input', 'source', 'wbr']);

  let lastGood = $state.raw<Extract<JSXPreviewParseResult, { ok: true }> | null>(null);
  let previousGood = $state.raw<Extract<JSXPreviewParseResult, { ok: true }> | null>(null);
  let failedResult = $state.raw<JSXPreviewParseResult | null>(null);
  let boundaryReset = $state.raw<(() => void) | null>(null);
  let contentElement = $state<HTMLDivElement | null>(null);

  const renderedResult = $derived.by(() => {
    const current = preview.result;
    if (current.ok && failedResult !== current) return current;
    if (preview.isStreaming && lastGood) return lastGood;
    return { ok: true, nodes: [] } satisfies Extract<JSXPreviewParseResult, { ok: true }>;
  });

  $effect.pre(() => {
    const current = preview.result;
    if (!current.ok || failedResult === current) return;
    previousGood = lastGood;
    lastGood = current;
  });

  $effect(() => {
    const current = preview.result;
    if (!boundaryReset || (failedResult === current && !preview.isStreaming)) return;

    const reset = boundaryReset;
    boundaryReset = null;
    void tick().then(reset);
  });

  function handleRenderError(error: unknown, reset: () => void): void {
    const normalized = error instanceof Error ? error : new Error(String(error));
    if (lastGood === preview.result) lastGood = previousGood;
    failedResult = preview.result;
    boundaryReset = reset;
    if (!preview.isStreaming) preview.reportError(normalized);
  }

  function preventSubmission(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  function createIsolationForm(): HTMLFormElement {
    const isolationForm = document.createElement('form');
    isolationForm.id = isolationFormId;
    isolationForm.hidden = true;
    isolationForm.setAttribute('aria-hidden', 'true');
    isolationForm.addEventListener('submit', preventSubmission);
    document.body.append(isolationForm);
    return isolationForm;
  }

  function isolateFormControl(control: HTMLElement): void {
    if (control.getAttribute('form') !== isolationFormId) {
      control.setAttribute('form', isolationFormId);
    }
    control.removeAttribute('name');
    control.removeAttribute('formaction');
    control.removeAttribute('formenctype');
    control.removeAttribute('formmethod');
    control.removeAttribute('formtarget');
    if ((control instanceof HTMLButtonElement || control instanceof HTMLInputElement)
      && ['submit', 'reset', 'image'].includes(control.type)) {
      control.setAttribute('type', 'button');
    }
  }

  function isolateRenderedControls(): void {
    if (!contentElement) return;
    for (const control of contentElement.querySelectorAll<HTMLElement>(
      'button, fieldset, input, output, select, textarea',
    )) {
      isolateFormControl(control);
    }
    for (const label of contentElement.querySelectorAll('label[for]')) {
      label.removeAttribute('for');
    }
  }

  onMount(() => {
    const isolationForm = createIsolationForm();
    const observer = contentElement ? new MutationObserver(isolateRenderedControls) : null;
    contentElement?.addEventListener('submit', preventSubmission, true);
    observer?.observe(contentElement as Node, {
      attributeFilter: ['for', 'form', 'formaction', 'formenctype', 'formmethod', 'formtarget', 'name', 'type'],
      attributes: true,
      childList: true,
      subtree: true,
    });
    isolateRenderedControls();
    return () => {
      observer?.disconnect();
      contentElement?.removeEventListener('submit', preventSubmission, true);
      isolationForm.remove();
    };
  });
</script>

{#snippet renderNodes(nodes: JSXPreviewNode[])}
  {#each nodes as node, nodeIndex (nodeIndex)}
    {#if node.type === 'text'}
      {node.value}
    {:else}
      {@render renderElement(node)}
    {/if}
  {/each}
{/snippet}

{#snippet renderElement(node: JSXPreviewElementNode)}
  {#if node.target.type === 'intrinsic'}
    {@const intrinsicTag = node.target.tag === 'form' ? 'div' : node.target.tag}
    {@const isolationTarget = formAssociatedTags.has(node.target.tag) ? isolationFormId : undefined}
    {#if voidTags.has(intrinsicTag)}
      <svelte:element this={intrinsicTag} {...node.props} form={isolationTarget} />
    {:else}
      <svelte:element this={intrinsicTag} {...node.props} form={isolationTarget}>
        {@render renderNodes(node.children)}
      </svelte:element>
    {/if}
  {:else}
    {#snippet componentChildren()}
      {@render renderNodes(node.children)}
    {/snippet}
    {#if node.target.type === 'component'}
      {@const Component = node.target.component}
      <Component {...node.props} children={componentChildren} />
    {:else}
      {@render node.target.snippet({ ...node.props, children: componentChildren })}
    {/if}
  {/if}
{/snippet}

<div bind:this={contentElement} {...rest} class={cn('svadmin-ai-jsx-preview__content', className)} aria-label="Generated JSX preview">
  <svelte:boundary onerror={handleRenderError}>
    {@render renderNodes(renderedResult.nodes)}
    {#snippet failed()}{/snippet}
  </svelte:boundary>
</div>

<style>
  .svadmin-ai-jsx-preview__content { min-width: 0; overflow-wrap: anywhere; }
</style>
