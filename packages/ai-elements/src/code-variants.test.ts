import { describe, expect, it } from 'vitest';
import { tv } from 'tailwind-variants';
import { codeVariants, type CodeVariant } from './components/code/code-variants.js';

describe('codeVariants compatibility', () => {
  it('preserves defaults and explicit null variants', () => {
    const variant: CodeVariant = undefined;
    expect(codeVariants({ variant })).toBe('svadmin-ai-code svadmin-ai-code--default');
    expect(codeVariants({ variant: 'secondary' })).toContain('svadmin-ai-code--secondary');
    expect(codeVariants({ variant: null })).toBe('svadmin-ai-code');
  });

  it('preserves nested arrays, conditional objects, and both class props', () => {
    const classes = codeVariants({
      class: ['custom-a', false, ['custom-b']],
      className: { 'custom-c': true, excluded: false },
    }).split(' ');
    expect(classes).toEqual(expect.arrayContaining(['custom-a', 'custom-b', 'custom-c']));
    expect(classes).not.toContain('excluded');
    expect(classes.join(' ')).not.toContain(',');
  });

  it('keeps the last caller utility when class props conflict', () => {
    const classes = codeVariants({ class: 'p-4', className: 'p-1' }).split(' ');
    expect(classes).toContain('p-1');
    expect(classes).not.toContain('p-4');
  });

  it('preserves metadata for consumer-defined variants', () => {
    const extended = tv({ extend: codeVariants, base: 'p-4' });
    expect(extended()).toContain('svadmin-ai-code--default');
    expect(extended({ variant: 'secondary' }).split(' ')).toEqual(
      expect.arrayContaining(['svadmin-ai-code', 'svadmin-ai-code--secondary', 'p-4']),
    );
    expect(codeVariants.variantKeys).toEqual(['variant']);
    expect(codeVariants.slots).toBeUndefined();
  });
});
