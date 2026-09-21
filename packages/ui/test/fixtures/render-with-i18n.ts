import { render } from '@testing-library/svelte';
import type { Component, ComponentImport, ComponentOptions } from '@testing-library/svelte-core/types';
import TestI18nScopeHost from './TestI18nScopeHost.svelte';

export function renderWithI18n<C extends Component>(
  component: ComponentImport<C>,
  options?: ComponentOptions<C>,
  locale = 'en',
) {
  return render(component, options, {
    wrapper: TestI18nScopeHost,
    wrapperProps: { locale },
  });
}
