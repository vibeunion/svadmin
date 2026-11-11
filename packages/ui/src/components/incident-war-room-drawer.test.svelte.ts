import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import IncidentWarRoomDrawer from './IncidentWarRoomDrawer.svelte';

describe('IncidentWarRoomDrawer suite', () => {
  it('renders incident details and mitigation action buttons', async () => {
    const onTriggerMitigation = vi.fn();
    render(IncidentWarRoomDrawer, {
      open: true,
      incidentId: 'INC-901',
      title: '主数据库连接池打满',
      severity: 'P0',
      onTriggerMitigation,
    });

    expect(document.body.textContent).toContain('P0');
    expect(document.body.textContent).toContain('INC-901');
    expect(document.body.textContent).toContain('主数据库连接池打满');

    const throttleBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('网关只读限流降级') || b.textContent?.includes('Read-only Throttle'),
    );
    expect(throttleBtn).toBeTruthy();
    if (throttleBtn) {
      await fireEvent.click(throttleBtn);
      expect(onTriggerMitigation).toHaveBeenCalledWith('throttle_readonly');
    }
  });
});
