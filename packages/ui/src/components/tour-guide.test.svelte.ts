import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Tour from './Tour.svelte';

describe('TourGuide Component', () => {
  it('renders tour guide dialog and step contents when open', () => {
    const steps = [
      { title: 'Welcome Step', description: 'This is the first step of onboarding' },
      { title: 'Second Step', description: 'Here is how to configure settings' },
    ];

    const { container } = render(Tour, {
      props: {
        steps,
        open: true,
        current: 0,
      },
    });

    const el = container.querySelector('[data-svadmin-component="TourGuide"]');
    expect(el).toBeTruthy();
    expect(screen.getByText('Welcome Step')).toBeTruthy();
    expect(screen.getByText('This is the first step of onboarding')).toBeTruthy();
  });

  it('navigates through steps with next button', async () => {
    const steps = [
      { title: 'Step 1', description: 'Description 1' },
      { title: 'Step 2', description: 'Description 2' },
    ];

    render(Tour, {
      props: {
        steps,
        open: true,
        current: 0,
      },
    });

    const nextBtn = screen.getByText('Next');
    expect(nextBtn).toBeTruthy();
    await fireEvent.click(nextBtn);

    expect(screen.getByText('Step 2')).toBeTruthy();
  });
});
