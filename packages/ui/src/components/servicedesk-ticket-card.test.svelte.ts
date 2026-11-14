import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ServiceDeskTicketCard from './ServiceDeskTicketCard.svelte';

describe('ServiceDeskTicketCard', () => {
  const reporter = { id: 'u1', name: '李强' };
  const assignee = { id: 'u2', name: '王工' };

  it('renders ticket id, title, priority, and reporter information', () => {
    render(ServiceDeskTicketCard, {
      props: {
        ticketId: 'TCK-20261114-001',
        title: '生产环境无法连接数据库集群',
        description: '应用服务报告连接超时错误，影响 3 个租户正常使用。',
        priority: 'P0',
        status: 'in_progress',
        reporter,
        assignee,
        categoryTags: ['基础设施', 'MySQL 集群'],
      },
    });

    expect(screen.getByText('TCK-20261114-001')).toBeTruthy();
    expect(screen.getByText('生产环境无法连接数据库集群')).toBeTruthy();
    expect(screen.getByText('P0 致命阻塞')).toBeTruthy();
    expect(screen.getByText('李强')).toBeTruthy();
    expect(screen.getByText('王工')).toBeTruthy();
    expect(screen.getByText('基础设施')).toBeTruthy();
  });

  it('displays SLA timer badge and computes urgency', () => {
    // 设定 30 分钟后截止
    const dueAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    render(ServiceDeskTicketCard, {
      props: {
        ticketId: 'TCK-20261114-002',
        title: '用户申请开具上月企业专用发票',
        reporter,
        sla: { dueAt, label: '首响 SLA' },
      },
    });

    expect(screen.getByText(/首响 SLA: 剩余 \d+m/)).toBeTruthy();
  });

  it('triggers quick action callbacks like urge, reassign, and resolve', async () => {
    const onurge = vi.fn();
    const onreassign = vi.fn();
    const onresolve = vi.fn();

    render(ServiceDeskTicketCard, {
      props: {
        ticketId: 'TCK-20261114-003',
        title: '单点登录 OAuth2 回调失败',
        reporter,
        assignee,
        onurge,
        onreassign,
        onresolve,
      },
    });

    const urgeBtn = screen.getByTitle('发送催办通知提醒处理人');
    await fireEvent.click(urgeBtn);
    expect(onurge).toHaveBeenCalled();

    const reassignBtn = screen.getByTitle('转派工单给其他同事');
    await fireEvent.click(reassignBtn);
    expect(onreassign).toHaveBeenCalled();

    const resolveBtn = screen.getByTitle('标记此工单已处理完成');
    await fireEvent.click(resolveBtn);
    expect(onresolve).toHaveBeenCalled();
  });
});
