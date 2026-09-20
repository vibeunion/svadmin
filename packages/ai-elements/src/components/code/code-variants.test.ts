import { describe, expect, it } from 'vitest';
import { codeVariants } from './index.js';

describe('native code variant compatibility', () => {
  it('keeps the default base background and border for omitted or null variants', () => {
    for (const value of [codeVariants(), codeVariants({ variant: undefined }), codeVariants({ variant: 'default' }), codeVariants({ variant: null })]) {
      const classes = value.split(/\s+/);
      expect(classes).toContain('border-border');
      expect(classes).toContain('bg-background');
      expect(classes).toContain('text-foreground');
      expect(classes).toContain('rounded-md');
      expect(classes).not.toContain('bg-secondary');
    }
  });

  it('selects secondary styles without conflicting default background/border classes', () => {
    const classes = codeVariants({ variant: 'secondary' }).split(/\s+/);
    expect(classes).toContain('border-transparent');
    expect(classes).toContain('bg-secondary');
    expect(classes).not.toContain('border-border');
    expect(classes).not.toContain('bg-background');
  });

  it('preserves both supported custom class arguments', () => {
    const classes = codeVariants({ class: 'custom-root', className: 'custom-content' }).split(/\s+/);
    expect(classes).toContain('custom-root');
    expect(classes).toContain('custom-content');
    expect(classes).toContain('bg-background');
  });
});
