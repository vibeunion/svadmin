import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import OtpInput from './OtpInput.svelte';

describe('OtpInput Component', () => {
  it('renders specified number of input slots with aria labels', () => {
    const { container } = render(OtpInput, {
      props: {
        length: 6,
        type: 'number',
      },
    });

    const root = container.querySelector('[data-svadmin-component="OtpInput"]');
    expect(root).toBeTruthy();

    const inputs = container.querySelectorAll('input');
    expect(inputs.length).toBe(6);
    expect(inputs[0]?.getAttribute('inputmode')).toBe('numeric');
  });

  it('triggers onchange and oncomplete when code is fully entered', async () => {
    const changeMock = vi.fn();
    const completeMock = vi.fn();

    const { container } = render(OtpInput, {
      props: {
        length: 4,
        type: 'number',
        onchange: changeMock,
        oncomplete: completeMock,
      },
    });

    const inputs = container.querySelectorAll('input');
    expect(inputs.length).toBe(4);

    if (inputs[0] && inputs[1] && inputs[2] && inputs[3]) {
      await fireEvent.input(inputs[0], { target: { value: '1' } });
      expect(changeMock).toHaveBeenCalledWith('1');

      await fireEvent.input(inputs[1], { target: { value: '2' } });
      await fireEvent.input(inputs[2], { target: { value: '3' } });
      await fireEvent.input(inputs[3], { target: { value: '4' } });

      expect(completeMock).toHaveBeenCalledWith('1234');
    }
  });

  it('handles paste event and populates digits', async () => {
    const completeMock = vi.fn();

    const { container } = render(OtpInput, {
      props: {
        length: 6,
        type: 'number',
        oncomplete: completeMock,
      },
    });

    const inputs = container.querySelectorAll('input');
    if (inputs[0]) {
      await fireEvent.paste(inputs[0], {
        clipboardData: {
          getData: () => '894210',
        },
      });

      expect(completeMock).toHaveBeenCalledWith('894210');
    }
  });
});
