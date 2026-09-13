import { tv, type VariantProps } from 'tailwind-variants';

export const codeVariants = tv({
  base: 'relative h-full overflow-auto rounded-md border border-border bg-background text-foreground',
  variants: {
    variant: {
      default: '',
      secondary: 'border-transparent bg-secondary',
    },
  },
  defaultVariants: { variant: 'default' },
});

export type CodeVariant = VariantProps<typeof codeVariants>['variant'];
export { default, default as Root, default as Code } from './Code.svelte';
export { default as Overflow, default as CodeOverflow } from '../code-block/CodeBlockOverflow.svelte';
export { default as CopyButton, default as CodeCopyButton } from '../code-block/CodeBlockCopyButton.svelte';
export type { CodeBlockOverflowProps as CodeOverflowProps } from '../code-block/CodeBlockOverflow.svelte';
export type { CodeRootProps } from './Code.svelte';
