import { cn, type ClassValue } from 'cn';

export type CodeVariant = 'default' | 'secondary' | undefined;

function composeCodeVariants({
  variant = 'default',
  class: className,
  className: extraClassName,
}: {
  variant?: CodeVariant | null;
  class?: ClassValue;
  className?: ClassValue;
} = {}): string {
  return cn('svadmin-ai-code', variant && `svadmin-ai-code--${variant}`, className, extraClassName);
}

// Preserve the metadata read by consumers that extend this public helper.
export const codeVariants = Object.assign(composeCodeVariants, {
  base: 'svadmin-ai-code',
  variants: {
    variant: {
      default: 'svadmin-ai-code--default',
      secondary: 'svadmin-ai-code--secondary',
    },
  },
  defaultVariants: { variant: 'default' as const },
  variantKeys: ['variant'] as Array<'variant'>,
  slots: undefined,
  extend: undefined,
  compoundVariants: [],
  compoundSlots: [],
});
