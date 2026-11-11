import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ServerStatusGrid, { type ServerNode } from './ServerStatusGrid.svelte';

describe('ServerStatusGrid Component', () => {
  const sampleNodes: ServerNode[] = [
    { id: 'node-1', name: 'app-gateway-01', region: 'cn-shanghai', status: 'healthy', latencyMs: 16, cpuPercent: 32, memoryPercent: 45, diskPercent: 55 },
    { id: 'node-2', name: 'app-gateway-02', region: 'cn-beijing', status: 'warning', latencyMs: 120, cpuPercent: 78, memoryPercent: 82, diskPercent: 88 },
  ];

  it('renders cluster summary counts and average latency', () => {
    const { container } = render(ServerStatusGrid, {
      props: {
        title: '微服务网关集群状态',
        nodes: sampleNodes,
      },
    });

    const root = container.querySelector('[data-svadmin-component="ServerStatusGrid"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('微服务网关集群状态');
    expect(container.textContent).toContain('1/2 健康在线');
    expect(container.textContent).toContain('1 节点告警');
    expect(container.textContent).toContain('平均延时:');
  });

  it('triggers onselectnode when node card is clicked', async () => {
    const onSelect = vi.fn();
    const { container } = render(ServerStatusGrid, {
      props: {
        nodes: sampleNodes,
        onselectnode: onSelect,
      },
    });

    const cards = container.querySelectorAll('button');
    expect(cards.length).toBe(2);
    if (cards[0]) {
      await fireEvent.click(cards[0]);
      expect(onSelect).toHaveBeenCalledWith(sampleNodes[0]);
    }
  });
});
