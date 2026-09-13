<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';
import type { Snippet } from 'svelte'; import OpenInProviderLink from './OpenInProviderLink.svelte'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script><OpenInProviderLink provider="t3" class={className} {...definedOptions({ "children": children })} {...rest} />
