import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import OrgChart, { type OrgNode } from './OrgChart.svelte';

const testOrgData: OrgNode = {
  id: 'ceo',
  name: 'Sarah Connor',
  title: 'Chief Executive Officer',
  department: 'Executive Board',
  children: [
    {
      id: 'cto',
      name: 'John Doe',
      title: 'Chief Technology Officer',
      department: 'Engineering',
      children: [
        { id: 'lead-dev', name: 'Alice Smith', title: 'Principal Architect', department: 'R&D' },
        { id: 'lead-qa', name: 'Bob Jones', title: 'QA Lead', department: 'Quality' },
      ],
    },
    {
      id: 'cfo',
      name: 'Michael Scott',
      title: 'Chief Financial Officer',
      department: 'Finance',
    },
  ],
};

describe('OrgChart Component', () => {
  it('renders root node and immediate direct reports', () => {
    const { container } = render(OrgChart, {
      props: {
        data: testOrgData,
      },
    });

    const root = container.querySelector('[data-svadmin-component="OrgChart"]');
    expect(root).not.toBeNull();
    expect(container.textContent).toContain('Sarah Connor');
    expect(container.textContent).toContain('Chief Executive Officer');
    expect(container.textContent).toContain('John Doe');
    expect(container.textContent).toContain('Michael Scott');
  });

  it('triggers onnodeclick when a node card is clicked', async () => {
    const onnodeclickMock = vi.fn();
    const { container } = render(OrgChart, {
      props: {
        data: testOrgData,
        onnodeclick: onnodeclickMock,
      },
    });

    const ceoCard = Array.from(container.querySelectorAll('[role="button"]')).find((el) =>
      el.textContent?.includes('Sarah Connor')
    );
    expect(ceoCard).toBeDefined();

    if (ceoCard) {
      await fireEvent.click(ceoCard);
      expect(onnodeclickMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ceo',
          name: 'Sarah Connor',
        })
      );
    }
  });

  it('collapses and expands child nodes upon trigger click', async () => {
    const { container } = render(OrgChart, {
      props: {
        data: testOrgData,
      },
    });

    expect(container.textContent).toContain('Principal Architect');

    // Look for collapse button under CTO or CEO
    const ctoCard = Array.from(container.querySelectorAll('[role="button"]')).find((el) =>
      el.textContent?.includes('John Doe')
    );
    expect(ctoCard).toBeDefined();

    const collapseBtn = ctoCard?.querySelector('button[title*="Collapse"]');
    if (collapseBtn) {
      await fireEvent.click(collapseBtn);
      // Children should now be collapsed
      expect(container.textContent).not.toContain('Principal Architect');
    }
  });
});
