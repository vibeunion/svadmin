import { cn } from '../../utils.js';

export type CodeVariant = 'default' | 'secondary' | null | undefined;
type CodeClassValue = Parameters<typeof cn>[number];

/** Select already-published utility classes without a runtime variant engine. */
export function codeVariants({
  variant = 'default',
  class: className,
  className: extraClassName,
}: {
  variant?: CodeVariant;
  class?: CodeClassValue;
  className?: CodeClassValue;
} = {}): string {
  // null disables the variant, not the original recipe's base border/background.
  return cn(
    'relative h-full overflow-auto rounded-md border text-foreground',
    variant === 'secondary'
      ? 'border-transparent bg-secondary'
      : 'border-border bg-background',
    className,
    extraClassName,
  );
}

export { default, default as Root, default as Code } from './Code.svelte';
export { default as Overflow, default as CodeOverflow } from '../code-block/CodeBlockOverflow.svelte';
export { default as CopyButton, default as CodeCopyButton } from '../code-block/CodeBlockCopyButton.svelte';
export type { CodeBlockOverflowProps as CodeOverflowProps } from '../code-block/CodeBlockOverflow.svelte';
export type { CodeRootProps } from './Code.svelte';
