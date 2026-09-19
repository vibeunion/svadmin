import { cn } from '../../utils.js';

export type CodeVariant = 'default' | 'secondary' | undefined;

/** 保留公开调用方式，但不再依赖运行时样式变体引擎。 */
export function codeVariants({ variant = 'default', class: className = '', className: extraClassName = '' }: { variant?: CodeVariant | null; class?: string; className?: string } = {}): string {
  return cn('relative h-full overflow-auto rounded-md border text-foreground', variant === 'secondary' ? 'border-transparent bg-secondary' : variant === null ? '' : 'border-border bg-background', className, extraClassName);
}

export { default, default as Root, default as Code } from './Code.svelte';
export { default as Overflow, default as CodeOverflow } from '../code-block/CodeBlockOverflow.svelte';
export { default as CopyButton, default as CodeCopyButton } from '../code-block/CodeBlockCopyButton.svelte';
export type { CodeBlockOverflowProps as CodeOverflowProps } from '../code-block/CodeBlockOverflow.svelte';
export type { CodeRootProps } from './Code.svelte';
