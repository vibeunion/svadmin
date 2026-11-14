import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import MetricWidget from './components/MetricWidget.svelte';

describe('MetricWidget admin formatters', () => {
  it('formats currency, percent and number through copy-format', () => {
    const currency = render(MetricWidget, { props: {
      widgetId: 'revenue',
      props: { label: 'Revenue', format: 'currency', currency: 'USD' },
      data: { status: 'ready', sourceId: 'revenue', value: 1234 },
      locale: 'en-US',
    } });
    expect(currency.container.textContent).toContain('$1,234.00');

    const percent = render(MetricWidget, { props: {
      widgetId: 'rate',
      props: { label: 'Rate', format: 'percent' },
      data: { status: 'ready', sourceId: 'rate', value: 0.12 },
      locale: 'en-US',
    } });
    expect(percent.container.textContent).toContain('12%');

    const number = render(MetricWidget, { props: {
      widgetId: 'count',
      props: { label: 'Count', format: 'number' },
      data: { status: 'ready', sourceId: 'count', value: 1234.5 },
      locale: 'en-US',
    } });
    expect(number.container.textContent).toContain('1,234.5');
  });
});