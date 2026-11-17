import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Tree from './Tree.svelte';
import Ribbon from './Ribbon.svelte';

describe('Tree treeData alias and key/title node properties', () => {
  it('renders tree nodes passed via treeData with key and title', () => {
    const { container } = render(Tree, {
      props: {
        treeData: [
          { key: 'node-1', title: 'Parent Node' },
          { key: 'node-2', title: 'Second Node' },
        ],
      },
    });
    const labels = container.querySelectorAll('.svadmin-tree__label');
    expect(labels.length).toBe(2);
    expect(labels[0]?.textContent?.trim()).toBe('Parent Node');
    expect(labels[1]?.textContent?.trim()).toBe('Second Node');
  });

  it('supports size="small" and blockNode options', () => {
    const { container } = render(Tree, {
      props: {
        treeData: [{ key: 'node-1', title: 'Node' }],
        size: 'small',
        blockNode: true,
      },
    });
    const root = container.querySelector('.svadmin-tree');
    expect(root?.getAttribute('data-size')).toBe('small');
    expect(root?.getAttribute('data-block-node')).toBe('true');
  });
});

describe('Ribbon placement aliases', () => {
  it('maps placement="left" and placement="right" to start and end', () => {
    const { container: leftContainer } = render(Ribbon, {
      props: { text: 'New', placement: 'left' },
    });
    const leftRibbon = leftContainer.querySelector('[data-placement="start"]');
    expect(leftRibbon).not.toBeNull();

    const { container: rightContainer } = render(Ribbon, {
      props: { text: 'Hot', placement: 'right' },
    });
    const rightRibbon = rightContainer.querySelector('[data-placement="end"]');
    expect(rightRibbon).not.toBeNull();
  });
});
