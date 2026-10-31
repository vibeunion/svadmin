import { cleanup, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import LiteBreadcrumbs from './LiteBreadcrumbs.svelte';
import LiteGrid from './LiteGrid.svelte';
import LiteSpace from './LiteSpace.svelte';
import LiteStatistic from './LiteStatistic.svelte';
import LiteStatusBadge from './LiteStatusBadge.svelte';
import LiteSteps from './LiteSteps.svelte';
import LiteTimeline from './LiteTimeline.svelte';

function snippet(html: string) {
  return createRawSnippet(() => ({ render: () => html }));
}

/**
 * Styling hook contract: a host `class` must land on the documented root element
 * next to the built-in class, and must never replace it. Batches add components
 * here as the hook debt is paid down (`packages/lite/CLASS-HOOKS.md`).
 */
const cases: Array<{
  name: string;
  root: string;
  tag: string;
  render: (options: { class: string }) => HTMLElement;
}> = [
  {
    name: 'LiteSpace',
    root: '.lite-space',
    tag: 'div',
    render: ({ class: className }) =>
      render(LiteSpace, { class: className, children: snippet('<span>a</span>') }).container,
  },
  {
    name: 'LiteGrid',
    root: '.lite-grid',
    tag: 'div',
    render: ({ class: className }) =>
      render(LiteGrid, { class: className, children: snippet('<span>a</span>') }).container,
  },
  {
    name: 'LiteBreadcrumbs',
    root: '.lite-breadcrumbs',
    tag: 'nav',
    render: ({ class: className }) =>
      render(LiteBreadcrumbs, { class: className, items: [{ label: 'Home' }] }).container,
  },
  {
    name: 'LiteStatusBadge',
    root: '.lite-status-badge',
    tag: 'span',
    render: ({ class: className }) => render(LiteStatusBadge, { class: className, status: 'active' }).container,
  },
  {
    name: 'LiteStatistic',
    root: '.lite-statistic',
    tag: 'div',
    render: ({ class: className }) => render(LiteStatistic, { class: className, value: 42 }).container,
  },
  {
    name: 'LiteTimeline',
    root: '.lite-timeline',
    tag: 'ol',
    render: ({ class: className }) =>
      render(LiteTimeline, { class: className, items: [{ id: 'e1', title: 'Shipped' }] }).container,
  },
  {
    name: 'LiteSteps',
    root: '.lite-steps',
    tag: 'ol',
    render: ({ class: className }) =>
      render(LiteSteps, { class: className, items: [{ title: 'Setup' }] }).container,
  },
];

describe('Lite styling hook contract', () => {
  for (const testCase of cases) {
    it(`merges the caller class on ${testCase.name}`, () => {
      const element = testCase.render({ class: 'host-surface' }).querySelector(testCase.root);

      expect(element).toBeTruthy();
      expect(element?.tagName.toLowerCase()).toBe(testCase.tag);
      expect(element?.classList.contains('host-surface')).toBe(true);
      // The built-in class list stays intact so host styles can layer on top.
      expect(element?.classList.contains(testCase.root.slice(1))).toBe(true);
      expect(element?.className.trim().split(/\s+/u)).toContain(testCase.root.slice(1));
    });
  }

  it('keeps the default markup unchanged when no class is passed', () => {
    const element = render(LiteStatistic, { value: 7 }).container.querySelector('.lite-statistic');

    expect(element?.classList.contains('lite-statistic')).toBe(true);
    expect(element?.className.trim().split(/\s+/u)).toHaveLength(2);
    expect(element?.textContent).toContain('7');
  });

  afterEach(() => {
    cleanup();
  });
});