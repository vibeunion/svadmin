import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ShiftScheduler, { type ShiftType, type StaffMember } from './ShiftScheduler.svelte';

describe('ShiftScheduler', () => {
  const staffList: StaffMember[] = [
    { id: 'u1', name: '张经理', code: 'EMP001', department: '技术运维部' },
    { id: 'u2', name: '李工', code: 'EMP002', department: '基础架构组' },
  ];

  const shiftTypes: ShiftType[] = [
    { id: 's_morning', name: '早班', code: 'M', hours: 8, colorToken: 'emerald', startTime: '08:00', endTime: '16:00' },
    { id: 's_night', name: '晚班', code: 'N', hours: 8, colorToken: 'indigo', startTime: '00:00', endTime: '08:00' },
    { id: 's_off', name: '休息', code: 'OFF', hours: 0, isRest: true, colorToken: 'slate' },
  ];

  it('renders scheduler title, shift legend badges, and staff members', () => {
    render(ShiftScheduler, {
      props: {
        staffList,
        shiftTypes,
        startDate: '2026-11-16',
      },
    });

    expect(screen.getByText('企业多班次轮值排班日程表')).toBeTruthy();
    expect(screen.getByText('张经理')).toBeTruthy();
    expect(screen.getByText('李工')).toBeTruthy();
    expect(screen.getByText('技术运维部')).toBeTruthy();
  });

  it('assigns selected shift on cell click and calls onchange', async () => {
    const onchange = vi.fn();
    render(ShiftScheduler, {
      props: {
        staffList,
        shiftTypes,
        startDate: '2026-11-16',
        onchange,
      },
    });

    // 找到排班单元格并点击
    const cellButtons = screen.getAllByTitle('点击分配班次');
    const firstCell = cellButtons[0];
    if (firstCell) {
      await fireEvent.click(firstCell);
      expect(onchange).toHaveBeenCalled();
    }
  });

  it('supports one-click batch filling for weekday shifts', async () => {
    const onchange = vi.fn();
    render(ShiftScheduler, {
      props: {
        staffList,
        shiftTypes,
        startDate: '2026-11-16',
        onchange,
      },
    });

    const batchBtns = screen.getAllByTitle('一键排工作日标准班');
    const firstBtn = batchBtns[0];
    if (firstBtn) {
      await fireEvent.click(firstBtn);
      expect(onchange).toHaveBeenCalled();
    }
  });

  it('detects overtime when weekly hours exceed threshold', () => {
    // 为李工排 6 天早班，共 48 小时（超 40 小时）
    const assignments = [
      { staffId: 'u2', date: '2026-11-16', shiftId: 's_morning' },
      { staffId: 'u2', date: '2026-11-17', shiftId: 's_morning' },
      { staffId: 'u2', date: '2026-11-18', shiftId: 's_morning' },
      { staffId: 'u2', date: '2026-11-19', shiftId: 's_morning' },
      { staffId: 'u2', date: '2026-11-20', shiftId: 's_morning' },
      { staffId: 'u2', date: '2026-11-21', shiftId: 's_morning' },
    ];

    render(ShiftScheduler, {
      props: {
        staffList,
        shiftTypes,
        assignments,
        startDate: '2026-11-16',
        maxWeeklyHours: 40,
      },
    });

    expect(screen.getByText('存在 1 项排班预警')).toBeTruthy();
    expect(screen.getByText('超标')).toBeTruthy();
  });
});
