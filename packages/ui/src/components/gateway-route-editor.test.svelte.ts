import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import GatewayRouteEditor from './GatewayRouteEditor.svelte';

describe('GatewayRouteEditor', () => {
  it('renders route configuration fields and default values', () => {
    render(GatewayRouteEditor, {
      props: {
        title: '微服务 API 网关路由编排',
        route: {
          id: 'route-test-01',
          name: '订单微服务路由',
          enabled: true,
          pathPattern: '/api/v1/orders/**',
          matchType: 'prefix',
          methods: ['GET', 'POST'],
          headers: [],
          upstreamUrl: 'http://order-cluster.internal:8080',
          stripPrefix: true,
          canaryEnabled: true,
          canaryWeight: 20,
        },
      },
    });

    expect(screen.getByText('微服务 API 网关路由编排')).toBeInTheDocument();
    expect(screen.getByDisplayValue('订单微服务路由')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/api/v1/orders/**')).toBeInTheDocument();
    expect(screen.getByDisplayValue('http://order-cluster.internal:8080')).toBeInTheDocument();
    expect(screen.getByText('规则已生效')).toBeInTheDocument();
  });

  it('toggles HTTP methods on click', async () => {
    render(GatewayRouteEditor, {
      props: {
        route: {
          id: 'route-test-02',
          name: '测试方法切换',
          enabled: true,
          pathPattern: '/api/**',
          matchType: 'prefix',
          methods: ['GET'],
          headers: [],
          upstreamUrl: 'http://upstream:8080',
          stripPrefix: false,
          canaryEnabled: false,
          canaryWeight: 0,
        },
      },
    });

    const postBtn = screen.getByRole('button', { name: 'POST' });
    await fireEvent.click(postBtn);
    expect(postBtn).toHaveClass('bg-primary');
  });

  it('runs sandbox match test and displays simulated result', async () => {
    render(GatewayRouteEditor, {
      props: {
        route: {
          id: 'route-test-03',
          name: '路径沙箱测试',
          enabled: true,
          pathPattern: '/api/v1/orders/**',
          matchType: 'prefix',
          methods: ['GET'],
          headers: [],
          upstreamUrl: 'http://order-service:8080',
          stripPrefix: false,
          canaryEnabled: false,
          canaryWeight: 0,
        },
      },
    });

    const runBtn = screen.getByRole('button', { name: /执行推演/ });
    await fireEvent.click(runBtn);

    expect(screen.getByText(/未满足前缀或模式匹配要求|测试路径与规则匹配成功/)).toBeInTheDocument();
  });

  it('triggers onsave callback when save button is clicked', async () => {
    const onsave = vi.fn();

    render(GatewayRouteEditor, {
      props: {
        onsave,
        route: {
          id: 'route-test-04',
          name: '保存测试路由',
          enabled: true,
          pathPattern: '/api/test/**',
          matchType: 'prefix',
          methods: ['GET'],
          headers: [],
          upstreamUrl: 'http://upstream:8080',
          stripPrefix: false,
          canaryEnabled: false,
          canaryWeight: 0,
        },
      },
    });

    const saveBtn = screen.getByRole('button', { name: /保存路由配置/ });
    await fireEvent.click(saveBtn);

    expect(onsave).toHaveBeenCalled();
  });
});
