import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import {
  evaluateFeatureFlag,
  hashStringToPercentage,
  registerFeatureFlags,
  setFeatureFlag,
  getFeatureFlag,
  clearFeatureFlags,
  type FeatureFlag,
} from './useFeatureFlag.svelte.js';
import FeatureFlagStudio from './FeatureFlagStudio.svelte';

describe('FeatureFlag Engine & Evaluation', () => {
  beforeEach(() => {
    clearFeatureFlags();
  });

  it('determines rollout bucket deterministically', () => {
    const val1 = hashStringToPercentage('flag_a:user_1');
    const val2 = hashStringToPercentage('flag_a:user_1');
    expect(val1).toBe(val2);
    expect(val1).toBeGreaterThanOrEqual(0);
    expect(val1).toBeLessThan(100);
  });

  it('respects emergency kill switch regardless of rules or enabled state', () => {
    const flag: FeatureFlag = {
      key: 'billing_v2',
      name: 'Billing V2',
      enabled: true,
      percentage: 100,
      killSwitch: true,
    };
    expect(evaluateFeatureFlag(flag, { userId: 'vip_user' })).toBe(false);
  });

  it('evaluates global enabled and disabled states', () => {
    const enabledFlag: FeatureFlag = {
      key: 'feature_on',
      name: 'On',
      enabled: true,
      percentage: 100,
    };
    const disabledFlag: FeatureFlag = {
      key: 'feature_off',
      name: 'Off',
      enabled: false,
    };
    expect(evaluateFeatureFlag(enabledFlag)).toBe(true);
    expect(evaluateFeatureFlag(disabledFlag)).toBe(false);
  });

  it('evaluates user whitelist rules correctly', () => {
    const flag: FeatureFlag = {
      key: 'experimental_ai',
      name: 'AI Beta',
      enabled: true,
      rules: [
        {
          field: 'userId',
          operator: 'in',
          values: ['user_alpha', 'user_beta'],
        },
      ],
    };
    expect(evaluateFeatureFlag(flag, { userId: 'user_alpha' })).toBe(true);
    expect(evaluateFeatureFlag(flag, { userId: 'user_gamma' })).toBe(true); // enabled is true
  });

  it('registers and retrieves flags from in-memory registry', () => {
    const flag: FeatureFlag = {
      key: 'dark_mode',
      name: 'Dark Mode',
      enabled: true,
    };
    registerFeatureFlags([flag]);
    expect(getFeatureFlag('dark_mode')).toEqual(flag);

    const updated = { ...flag, enabled: false };
    setFeatureFlag(updated);
    expect(getFeatureFlag('dark_mode')?.enabled).toBe(false);
  });
});

describe('FeatureFlagStudio Component', () => {
  const initialFlags: FeatureFlag[] = [
    {
      key: 'search_v2',
      name: 'Instant Search V2',
      description: 'Upgraded search query parser',
      enabled: true,
      percentage: 50,
      tags: ['search', 'beta'],
    },
    {
      key: 'export_csv',
      name: 'Async CSV Export',
      description: 'Stream export to s3',
      enabled: false,
      percentage: 0,
      tags: ['export'],
    },
  ];

  it('renders root studio container with semantic attribute', () => {
    const { container } = render(FeatureFlagStudio, {
      flags: initialFlags,
      showSimulator: true,
    });
    const root = container.querySelector('[data-svadmin-component="FeatureFlagStudio"]');
    expect(root).not.toBeNull();
    expect(screen.getByText('Feature Flag Studio')).toBeDefined();
    expect(screen.getByText('Instant Search V2')).toBeDefined();
    expect(screen.getByText('Async CSV Export')).toBeDefined();
  });

  it('filters flags by search query', async () => {
    render(FeatureFlagStudio, {
      flags: initialFlags,
    });
    const searchInput = screen.getByPlaceholderText(/search by flag key/i);
    await fireEvent.input(searchInput, { target: { value: 'search_v2' } });

    expect(screen.getByText('Instant Search V2')).toBeDefined();
    expect(screen.queryByText('Async CSV Export')).toBeNull();
  });

  it('opens emergency kill switch confirmation dialog on trigger', async () => {
    const { container } = render(FeatureFlagStudio, {
      flags: initialFlags,
    });
    const killSwitchButtons = screen.getAllByText('Trigger Kill Switch');
    expect(killSwitchButtons.length).toBeGreaterThan(0);

    await fireEvent.click(killSwitchButtons[0]!);

    const modal = container.querySelector('[data-svadmin-component="FeatureFlagStudioKillSwitchDialog"]');
    expect(modal).not.toBeNull();
    expect(screen.getByText('Emergency Kill Switch Confirmation')).toBeDefined();
  });
});
