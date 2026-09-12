import type { ComponentProps } from 'svelte';
import { describe, expectTypeOf, it } from 'vitest';
import type { ComponentRegistry, getComponentRegistry } from './component-registry.svelte';
import type Input from './components/ui/input/input.svelte';

describe('component registry contracts', () => {
  it('requires the real detail-page props', () => {
    type ShowProps = ComponentProps<ComponentRegistry['ShowPage']>;
    expectTypeOf<ShowProps>().not.toBeAny();
    expectTypeOf<{ resourceName: string }>().not.toExtend<ShowProps>();
    expectTypeOf<{ resourceName: string; id: string }>().toExtend<ShowProps>();
  });

  it('preserves primitive contracts instead of erasing them with any', () => {
    type ButtonProps = ComponentProps<ComponentRegistry['Button']>;
    expectTypeOf<ButtonProps>().not.toBeAny();
    expectTypeOf<{ variant: 'unsupported' }>().not.toExtend<ButtonProps>();
    expectTypeOf<{ variant: 'outline' }>().toExtend<ButtonProps>();
    expectTypeOf<ComponentRegistry['Input']>().toEqualTypeOf<typeof Input>();
  });

  it('models an absent component registry', () => {
    expectTypeOf<ReturnType<typeof getComponentRegistry>>()
      .toEqualTypeOf<ComponentRegistry | undefined>();
  });
});
