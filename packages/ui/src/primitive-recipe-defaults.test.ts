import { describe, expect, it } from 'vitest';
import { badgeRecipe, buttonRecipe, describeRecipe } from './recipes';
import { badgeVariants } from './components/ui/badge/badge-variants';
import { buttonVariants } from './components/ui/button/button-variants';

describe('primitive recipe defaults', () => {
  it.each([{}, { variant: undefined, size: undefined }])('defaults only absent button variants: %j', props => {
    const expected = 'svadmin-button svadmin-button--default svadmin-button-size--default';
    expect(buttonRecipe(props).root).toBe(expected);
    expect(buttonVariants(props)).toBe(expected);
  });

  it.each([
    [{ variant: null, size: null }, 'svadmin-button'],
    [{ variant: null }, 'svadmin-button svadmin-button-size--default'],
    [{ size: null }, 'svadmin-button svadmin-button--default'],
    [{ variant: 'outline', size: null }, 'svadmin-button svadmin-button--outline'],
    [{ variant: null, size: 'sm' }, 'svadmin-button svadmin-button-size--sm'],
  ] as const)('preserves independent null overrides: %j', (props, expected) => {
    expect(buttonRecipe(props).root).toBe(expected);
    expect(buttonVariants(props)).toBe(expected);
  });

  it.each([
    [{}, 'svadmin-badge svadmin-badge--default'],
    [{ variant: undefined }, 'svadmin-badge svadmin-badge--default'],
    [{ variant: null }, 'svadmin-badge'],
    [{ variant: 'subtle-success' }, 'svadmin-badge svadmin-badge--subtle-success'],
  ] as const)('preserves badge defaults and null: %j', (props, expected) => {
    expect(badgeRecipe(props).root).toBe(expected);
    expect(badgeVariants(props)).toBe(expected);
  });

  it('keeps caller classes with suppressed variants', () => {
    expect(buttonRecipe({ variant: null, size: null, className: 'host' }).root).toBe('svadmin-button host');
    expect(badgeRecipe({ variant: null, class: 'host' }).root).toBe('svadmin-badge host');
    expect(buttonVariants({ variant: null, size: null, class: 'host', className: 'extra' })).toBe('svadmin-button host extra');
    expect(badgeVariants({ variant: null, class: 'host', className: 'extra' })).toBe('svadmin-badge host extra');
  });

  it('retains public metadata defaults and anatomy', () => {
    expect(describeRecipe('buttonRecipe').defaults).toEqual({ variant: 'default', size: 'default' });
    expect(describeRecipe('badgeRecipe').defaults).toEqual({ variant: 'default' });
    expect(describeRecipe('buttonRecipe').slots).toEqual(['root']);
    expect(describeRecipe('badgeRecipe').slots).toEqual(['root']);
    expect(describeRecipe('textareaRecipe').slots).toEqual(['root']);
    expect(describeRecipe('contentHeaderRecipe').slots).toContain('heading');
    expect(describeRecipe('contentPageRecipe').defaults).toEqual({ width: 'default', density: 'comfortable' });
    expect(describeRecipe('contentPageRecipe').variants['density']).toEqual(['compact', 'comfortable']);
    expect(describeRecipe('contentHeaderRecipe').defaults).toEqual({ density: 'comfortable' });
    expect(describeRecipe('contentHeaderRecipe').variants['density']).toEqual(['compact', 'comfortable']);
    expect(describeRecipe('badgeRecipe').variants['variant']).toContain('subtle-success');
    expect(describeRecipe('productWorkspaceRecipe').defaults).toEqual({ hasSecondary: false });
  });
});
