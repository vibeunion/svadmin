import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render } from '@testing-library/svelte';
import { Card } from './ui/card/index.js';
import ProCard from './ProCard.svelte';

const textSnippet = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('Card enterprise design system options', () => {
  it('supports cover, actions, headerStyle, and bodyStyle', () => {
    const { container } = render(Card, {
      props: {
        title: 'Project Alpha',
        cover: textSnippet('Cover Image Banner'),
        actions: textSnippet('Action Buttons'),
        headerStyle: 'background-color: var(--card);',
        bodyStyle: 'padding: 18px;',
        children: textSnippet('Card Main Content'),
      },
    });

    const cover = container.querySelector('[data-slot="card-cover"]');
    expect(cover).not.toBeNull();
    expect(cover?.textContent).toContain('Cover Image Banner');

    const actions = container.querySelector('[data-slot="card-actions"]');
    expect(actions).not.toBeNull();
    expect(actions?.textContent).toContain('Action Buttons');

    const header = container.querySelector('[data-slot="card-header"]');
    expect(header?.getAttribute('style')).toContain('background-color: var(--card);');

    const content = container.querySelector('[data-slot="card-content"]');
    expect(content?.getAttribute('style')).toContain('padding: 18px;');
  });

  it('supports small and mini sizes with small data attribute and classes', () => {
    const { container } = render(Card, {
      props: {
        size: 'small',
        title: 'Compact Card',
        children: textSnippet('Compact Content'),
      },
    });

    const card = container.querySelector('[data-slot="card"]');
    expect(card?.getAttribute('data-size')).toBe('sm');
    expect(card?.className).toContain('svadmin-card--small');
  });
});

describe('ProCard enterprise design system options', () => {
  it('supports cover, headerStyle, bodyStyle, and actions', () => {
    const { container } = render(ProCard, {
      props: {
        title: 'Executive Summary',
        cover: textSnippet('ProCard Cover Media'),
        actions: textSnippet('Approve / Reject'),
        headerStyle: 'padding-top: 10px;',
        bodyStyle: 'margin-bottom: 5px;',
        children: textSnippet('ProCard Content Section'),
      },
    });

    const cover = container.querySelector('[data-slot="procard-cover"]');
    expect(cover).not.toBeNull();
    expect(cover?.textContent).toContain('ProCard Cover Media');

    expect(container.textContent).toContain('Approve / Reject');
    expect(container.textContent).toContain('ProCard Content Section');

    const proCard = container.querySelector('[data-svadmin-component="ProCard"]');
    expect(proCard).not.toBeNull();
  });
});
