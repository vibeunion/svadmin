import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TrafficTopologyInspector, {
  type TopologyNode,
  type TopologyEdge
} from './TrafficTopologyInspector.svelte';

const mockNodes: TopologyNode[] = [
  {
    id: 'gw-1',
    label: 'API Ingress Gateway',
    type: 'gateway',
    status: 'healthy',
    region: 'cn-beijing-a',
    qps: 12500,
    latencyMsP99: 12,
    errorRatePercent: 0.01,
    activeInstances: 6
  },
  {
    id: 'srv-order',
    label: 'Order Center Microservice',
    type: 'service',
    status: 'warning',
    region: 'cn-beijing-b',
    qps: 8400,
    latencyMsP99: 240,
    errorRatePercent: 1.45,
    activeInstances: 12
  },
  {
    id: 'srv-pay',
    label: 'Payment Gateway Broker',
    type: 'service',
    status: 'bypassed',
    region: 'cn-shanghai-a',
    qps: 0,
    latencyMsP99: 0,
    errorRatePercent: 0,
    activeInstances: 0
  }
];

const mockEdges: TopologyEdge[] = [
  { id: 'e1', from: 'API Ingress Gateway', to: 'Order Center Microservice', protocol: 'gRPC', trafficPercentage: 80 },
  { id: 'e2', from: 'Order Center Microservice', to: 'Payment Gateway Broker', protocol: 'HTTP/2', trafficPercentage: 20 }
];

describe('TrafficTopologyInspector Component', () => {
  it('renders root container, metrics overview, and node cards', () => {
    const { container } = render(TrafficTopologyInspector, {
      props: {
        nodes: mockNodes,
        edges: mockEdges
      }
    });

    const root = container.querySelector('[data-svadmin-component="TrafficTopologyInspector"]');
    expect(root).toBeTruthy();

    expect(container.textContent).toContain('多云微服务实时流量拓扑与链路监控');
    expect(container.textContent).toContain('API Ingress Gateway');
    expect(container.textContent).toContain('Order Center Microservice');
    expect(container.textContent).toContain('Payment Gateway Broker');
    expect(container.textContent).toContain('20,900'); // 12500 + 8400 + 0
  });

  it('triggers onToggleBypass callback when toggling node bypass', async () => {
    const onToggleBypass = vi.fn();
    const { container } = render(TrafficTopologyInspector, {
      props: {
        nodes: mockNodes,
        onToggleBypass
      }
    });

    // Node 1 is healthy, button says 一键熔断旁路
    const bypassBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('一键熔断旁路')
    );
    expect(bypassBtn).toBeTruthy();
    if (bypassBtn) {
      await fireEvent.click(bypassBtn);
      expect(onToggleBypass).toHaveBeenCalledWith('gw-1', true);
    }
  });

  it('triggers onRefresh callback', async () => {
    const onRefresh = vi.fn();
    const { container } = render(TrafficTopologyInspector, {
      props: {
        nodes: mockNodes,
        onRefresh
      }
    });

    const refreshBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('刷新拓扑')
    );
    expect(refreshBtn).toBeTruthy();
    if (refreshBtn) {
      await fireEvent.click(refreshBtn);
      expect(onRefresh).toHaveBeenCalled();
    }
  });
});
