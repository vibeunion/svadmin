import { cleanup, fireEvent, render as renderComponent, waitFor, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testLocalStorage } from '../../setupTest.js';
import type {
  AccessControlProvider,
  AgentProvider,
  AuditLogProvider,
  AuthProvider,
  ChatMessage,
  ChatProvider,
  DataProvider,
  LiveProvider,
  NotificationProvider,
  ResourceDefinition,
  RouterProvider,
  TaskProvider,
  I18nProvider,
} from '@svadmin/core';
import {
  getAccessControlProvider,
  getAgentProvider,
  getAuditLogProvider,
  getAuthProvider,
  getChatProvider,
  getDataProvider,
  getLocale,
  getNotificationProvider,
  getResources,
  getRouterProvider,
  getTaskProvider,
  getTheme,
  resetContext,
  setAccessControlProvider,
  setAuditLogProvider,
  setChatProvider,
  setLocale,
  setResources,
} from '@svadmin/core';
import type { AdminProviderBundle } from '../types.js';
import {
  getParams,
  getRouterProviderInstance,
  initRouter,
} from '../router-state.svelte.js';
import {
  afterEach as registerAfterEach,
  beforeEach as registerBeforeEach,
} from '@svadmin/core/router';
import ContextHost from './admin-app.context.test-host.svelte';
import AuditLogDrawer from './AuditLogDrawer.svelte';
import InsightCard from './InsightCard.svelte';
import Sidebar from './Sidebar.svelte';

function createDataProvider(instance: string): DataProvider {
  return {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => `https://${instance}.example.test`,
  } as DataProvider;
}

function scopedChatStorageKey(
  apiUrl: string,
  tenantIdentity: string | number | undefined,
  panelKey?: string,
): string {
  const typedTenant = tenantIdentity === undefined
    ? null
    : [typeof tenantIdentity, String(tenantIdentity)];
  const baseKey = `svadmin-chat:${encodeURIComponent(JSON.stringify([apiUrl, typedTenant]))}`;
  return panelKey === undefined
    ? baseKey
    : `${baseKey}:${encodeURIComponent(JSON.stringify(panelKey))}`;
}

function createAuthProvider(instance: string): AuthProvider {
  return {
    __testId: instance,
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity: async () => ({ id: instance, name: instance }),
  } as AuthProvider;
}

function createTaskProvider(instance: string): TaskProvider {
  return {
    __testId: instance,
    submit: async () => ({ wait: async () => ({ id: `${instance}-task` }) }),
    get: async taskId => ({ id: taskId }),
    list: async () => ({ data: [] }),
  } as TaskProvider;
}

function createRouterProvider(instance: string): RouterProvider {
  let pathname = '/';
  let queryParams: Record<string, string> = {};
  return {
    go: ({ to, query }) => {
      const target = new URL(to, 'https://router.example.test');
      pathname = target.pathname;
      queryParams = {
        ...Object.fromEntries(target.searchParams.entries()),
        ...query,
      };
    },
    back: () => {},
    parse: () => ({
      pathname,
      params: { instance, ...queryParams },
    }),
  };
}

function createResource(instance: string): ResourceDefinition {
  return {
    name: `${instance}-resource`,
    label: `${instance} resource`,
    fields: [],
  };
}

function createProviderBundle(instance: string, dataProvider: AdminProviderBundle['dataProvider']): AdminProviderBundle {
  const accessControlProvider = {
    __testId: `${instance}-access`,
    can: async () => ({ can: true }),
    options: { buttons: { enableAccessControl: true } },
  } as AccessControlProvider;
  const liveProvider = {
    __testId: `${instance}-live`,
    subscribe: () => () => {},
    publish: () => {},
  } as LiveProvider;
  const auditLogProvider = {
    __testId: `${instance}-audit`,
    create: async () => ({ timestamp: '', action: 'create' as const }),
    get: async () => [],
    update: async () => ({ timestamp: '', action: 'update' as const }),
  } as AuditLogProvider;
  const notificationProvider = {
    __testId: `${instance}-notification`,
    open: () => {},
    close: () => {},
  } as NotificationProvider;
  const chatProvider = {
    __testId: `${instance}-chat`,
    sendMessage: async () => 'ok',
  } as ChatProvider;
  const agentProvider = {
    __testId: `${instance}-agent`,
    async *chat() {
      yield { type: 'done' as const };
    },
  } as AgentProvider;

  return {
    dataProvider,
    authProvider: createAuthProvider(`${instance}-auth`),
    accessControlProvider,
    liveProvider,
    auditLogProvider,
    notificationProvider,
    chatProvider,
    agentProvider,
  };
}

function createConsumerProviderBundle(instance: string) {
  const accessCan = vi.fn(async (request: Parameters<AccessControlProvider['can']>[0]) => (
    Array.isArray(request)
      ? request.map(() => ({ can: true }))
      : { can: true }
  ));
  const auditGet = vi.fn(async () => []);
  const chatSend = vi.fn(async (
    _messages: Parameters<ChatProvider['sendMessage']>[0],
    _options?: Parameters<ChatProvider['sendMessage']>[1],
  ) => `${instance}-reply`);
  const base = createProviderBundle(instance, createDataProvider(instance));
  const bundle: AdminProviderBundle = {
    ...base,
    accessControlProvider: {
      can: accessCan,
      options: { buttons: { enableAccessControl: true } },
    },
    auditLogProvider: {
      create: async () => ({ timestamp: '', action: 'create' as const }),
      get: auditGet,
      update: async () => ({ timestamp: '', action: 'update' as const }),
    },
    chatProvider: { sendMessage: chatSend },
  };
  return { bundle, accessCan, auditGet, chatSend };
}

function createApprovalAgent(instance: string) {
  const approveToolCall = vi.fn();
  const chat = vi.fn((..._args: Parameters<AgentProvider['chat']>) => (async function* () {
    yield {
      type: 'approval_request' as const,
      id: 'shared-approval-id',
      tool: `${instance}-tool`,
      args: {},
      description: `${instance} approval`,
    };
    yield { type: 'done' as const };
  })());
  return {
    provider: { chat, approveToolCall } satisfies AgentProvider,
    chat,
    approveToolCall,
  };
}

async function findScopedElement(container: HTMLElement, selector: string): Promise<HTMLElement> {
  return waitFor(() => {
    const element = container.querySelector<HTMLElement>(selector);
    expect(element).not.toBeNull();
    return element as HTMLElement;
  });
}

function createI18nProvider(instance: string, initialLocale = 'en'): I18nProvider {
  let locale = initialLocale;
  return {
    translate: key => `${instance}:${locale}:${key}`,
    getLocale: () => locale,
    setLocale: nextLocale => { locale = nextLocale; },
    getAvailableLocales: () => ['en', 'zh-CN'],
  };
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'trace').mockImplementation(() => {});
  expect(globalThis.localStorage).toBe(testLocalStorage);
  expect(window.localStorage).toBe(testLocalStorage);
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({
      cancel: () => {},
      finished: Promise.resolve(),
    }),
  });
  resetContext();
});

afterEach(() => {
  cleanup();
  resetContext();
  initRouter(undefined);
  vi.restoreAllMocks();
});

describe('AdminApp context isolation', () => {
  it('accepts named data providers and a provider bundle while preserving direct prop precedence', async () => {
    const defaultProvider = createDataProvider('bundle-default');
    const analyticsProvider = createDataProvider('bundle-analytics');
    const directAuthProvider = createAuthProvider('direct-auth');
    const bundle = createProviderBundle('first-bundle', { default: defaultProvider, analytics: analyticsProvider });
    const secondBundle = createProviderBundle('second-bundle', {
      default: createDataProvider('second-default'),
      analytics: createDataProvider('second-analytics'),
    });

    const resource = createResource('bundle');
    resource.meta = { dataProviderName: 'analytics' };

    const view = renderComponent(ContextHost, {
      instance: 'bundle',
      providerBundle: bundle,
      authProvider: directAuthProvider,
      routerProvider: createRouterProvider('bundle'),
      resources: [resource],
      tenant: { tenantId: 'first-tenant' },
    });
    const secondResource = createResource('second');
    secondResource.meta = { dataProviderName: 'analytics' };
    const secondView = renderComponent(ContextHost, {
      instance: 'second',
      providerBundle: secondBundle,
      routerProvider: createRouterProvider('second'),
      resources: [secondResource],
      tenant: { tenantId: 'second-tenant' },
    });

    await waitFor(() => {
      expect(view.queryByTestId('context-probe-bundle')).not.toBeNull();
      expect(secondView.queryByTestId('context-probe-second')).not.toBeNull();
    });

    const probe = view.getByTestId('context-probe-bundle');
    expect(probe.getAttribute('data-provider')).toBe('https://bundle-default.example.test');
    expect(probe.getAttribute('data-provider-names')).toBe('default,analytics');
    expect(probe.getAttribute('data-resource-provider')).toBe('https://bundle-analytics.example.test');
    expect(probe.getAttribute('data-auth')).toBe('direct-auth');
    expect(probe.getAttribute('data-live')).toBe('first-bundle-live');
    expect(probe.getAttribute('data-access')).toBe('first-bundle-access');
    expect(probe.getAttribute('data-audit')).toBe('first-bundle-audit');
    expect(probe.getAttribute('data-notification')).toBe('first-bundle-notification');
    expect(probe.getAttribute('data-chat')).toBe('first-bundle-chat');
    expect(probe.getAttribute('data-agent')).toBe('first-bundle-agent');
    expect(probe.getAttribute('data-tenant')).toBe('first-tenant');

    const secondProbe = secondView.getByTestId('context-probe-second');
    expect(secondProbe.getAttribute('data-provider')).toBe('https://second-default.example.test');
    expect(secondProbe.getAttribute('data-resource-provider')).toBe('https://second-analytics.example.test');
    expect(secondProbe.getAttribute('data-auth')).toBe('second-bundle-auth');
    expect(secondProbe.getAttribute('data-live')).toBe('second-bundle-live');
    expect(secondProbe.getAttribute('data-access')).toBe('second-bundle-access');
    expect(secondProbe.getAttribute('data-audit')).toBe('second-bundle-audit');
    expect(secondProbe.getAttribute('data-notification')).toBe('second-bundle-notification');
    expect(secondProbe.getAttribute('data-chat')).toBe('second-bundle-chat');
    expect(secondProbe.getAttribute('data-agent')).toBe('second-bundle-agent');
    expect(secondProbe.getAttribute('data-tenant')).toBe('second-tenant');

    // Scoped bundles must not mutate the legacy module-level compatibility providers.
    expect(getAccessControlProvider()).toBeNull();
    expect(getAuditLogProvider()).toBeNull();
    expect(getNotificationProvider()).toBeNull();
    expect(getChatProvider()).toBeNull();
    expect(getAgentProvider()).toBeNull();
  });

  it('keeps two mounted app instances isolated and clears optional providers', async () => {
    const first = renderComponent(ContextHost, {
      instance: 'first',
      dataProvider: createDataProvider('first'),
      authProvider: createAuthProvider('first'),
      taskProvider: createTaskProvider('first'),
      routerProvider: createRouterProvider('first'),
      resources: [createResource('first')],
    });

    const second = renderComponent(ContextHost, {
      instance: 'second',
      dataProvider: createDataProvider('second'),
      routerProvider: createRouterProvider('second'),
      resources: [createResource('second')],
    });

    await waitFor(() => {
      expect(first.queryByTestId('context-probe-first')).not.toBeNull();
      expect(second.queryByTestId('context-probe-second')).not.toBeNull();
    }, { timeout: 20_000 });

    const firstProbe = first.getByTestId('context-probe-first');
    const secondProbe = second.getByTestId('context-probe-second');

    expect(firstProbe.getAttribute('data-provider')).toBe('https://first.example.test');
    expect(firstProbe.getAttribute('data-resources')).toBe('first-resource');
    expect(firstProbe.getAttribute('data-auth')).toBe('first');
    expect(firstProbe.getAttribute('data-task')).toBe('first');
    expect(firstProbe.getAttribute('data-router')).toBe('first');
    expect(firstProbe.getAttribute('data-route-instance')).toBe('first');

    expect(secondProbe.getAttribute('data-provider')).toBe('https://second.example.test');
    expect(secondProbe.getAttribute('data-resources')).toBe('second-resource');
    expect(secondProbe.getAttribute('data-auth')).toBe('none');
    expect(secondProbe.getAttribute('data-task')).toBe('none');
    expect(secondProbe.getAttribute('data-router')).toBe('second');
    expect(secondProbe.getAttribute('data-route-instance')).toBe('second');

    expect(() => getDataProvider()).toThrow('DataProvider not found');
    expect(getResources()).toEqual([]);
    expect(getAuthProvider({ optional: true })).toBeNull();
    expect(getTaskProvider({ optional: true })).toBeUndefined();
    expect(getRouterProvider()).toBeUndefined();
    expect(getRouterProviderInstance()).toBeUndefined();
    expect(getParams()).toEqual({});
  });

  it('owns independent locale scopes and writes tree changes back through the binding', async () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('zh-CN');
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['zh-CN']);
    setLocale('zh-CN');

    const first = renderComponent(ContextHost, {
      instance: 'first',
      dataProvider: createDataProvider('first'),
      routerProvider: createRouterProvider('first'),
      resources: [createResource('first')],
      locale: 'en',
      nextLocale: 'zh-CN',
    });
    const second = renderComponent(ContextHost, {
      instance: 'second',
      dataProvider: createDataProvider('second'),
      routerProvider: createRouterProvider('second'),
      resources: [createResource('second')],
      locale: 'zh-CN',
      nextLocale: 'en',
    });
    const implicit = renderComponent(ContextHost, {
      instance: 'implicit',
      dataProvider: createDataProvider('implicit'),
      routerProvider: createRouterProvider('implicit'),
      resources: [createResource('implicit')],
    });

    await waitFor(() => {
      expect(first.getByTestId('context-probe-first').getAttribute('data-locale')).toBe('en');
      expect(first.getByTestId('context-probe-first').getAttribute('data-translation')).toBe('Save');
      expect(second.getByTestId('context-probe-second').getAttribute('data-locale')).toBe('zh-CN');
      expect(second.getByTestId('context-probe-second').getAttribute('data-translation')).toBe('保存');
      expect(implicit.getByTestId('context-probe-implicit').getAttribute('data-locale')).toBe('zh-CN');
      expect(implicit.getByTestId('context-probe-implicit').getAttribute('data-translation')).toBe('保存');
    });

    await fireEvent.click(first.getByTestId('change-locale-later-first'));

    await waitFor(() => {
      expect(first.getByTestId('context-probe-first').getAttribute('data-locale')).toBe('zh-CN');
      expect(first.getByTestId('context-probe-first').getAttribute('data-translation')).toBe('保存');
      expect(first.getByTestId('bound-locale-first').textContent).toBe('zh-CN');
      expect(second.getByTestId('context-probe-second').getAttribute('data-locale')).toBe('zh-CN');
      expect(implicit.getByTestId('context-probe-implicit').getAttribute('data-locale')).toBe('zh-CN');
    });

    await fireEvent.click(second.getByTestId('change-locale-second'));

    await waitFor(() => {
      expect(second.getByTestId('context-probe-second').getAttribute('data-locale')).toBe('en');
      expect(second.getByTestId('context-probe-second').getAttribute('data-translation')).toBe('Save');
      expect(second.getByTestId('bound-locale-second').textContent).toBe('en');
      expect(first.getByTestId('context-probe-first').getAttribute('data-locale')).toBe('zh-CN');
    });
    expect(getLocale()).toBe('zh-CN');
  });

  it('applies owner locale updates without leaking to another app or legacy locale state', async () => {
    setLocale('zh-CN');
    const view = renderComponent(ContextHost, {
      instance: 'owner',
      dataProvider: createDataProvider('owner'),
      routerProvider: createRouterProvider('owner'),
      resources: [createResource('owner')],
      locale: 'en',
      nextLocale: 'en',
    });

    await view.rerender({
      instance: 'owner',
      dataProvider: createDataProvider('owner'),
      routerProvider: createRouterProvider('owner'),
      resources: [createResource('owner')],
      locale: 'zh-CN',
      nextLocale: 'en',
    });

    await waitFor(() => {
      expect(view.getByTestId('context-probe-owner').getAttribute('data-locale')).toBe('zh-CN');
      expect(view.getByTestId('bound-locale-owner').textContent).toBe('zh-CN');
    });
    expect(getLocale()).toBe('zh-CN');

    await fireEvent.click(view.getByTestId('change-locale-owner'));
    await waitFor(() => {
      expect(view.getByTestId('context-probe-owner').getAttribute('data-locale')).toBe('en');
      expect(view.getByTestId('bound-locale-owner').textContent).toBe('en');
    });
    expect(getLocale()).toBe('zh-CN');
  });

  it('uses an explicit tree-local i18n provider without exposing it to sibling apps', async () => {
    const localized = renderComponent(ContextHost, {
      instance: 'localized',
      dataProvider: createDataProvider('localized'),
      routerProvider: createRouterProvider('localized'),
      resources: [createResource('localized')],
      i18nProvider: createI18nProvider('localized', 'zh-CN'),
      nextLocale: 'en',
    });
    const defaulted = renderComponent(ContextHost, {
      instance: 'defaulted',
      dataProvider: createDataProvider('defaulted'),
      routerProvider: createRouterProvider('defaulted'),
      resources: [createResource('defaulted')],
    });

    await waitFor(() => {
      expect(localized.getByTestId('context-probe-localized').getAttribute('data-locale')).toBe('zh-CN');
      expect(localized.getByTestId('context-probe-localized').getAttribute('data-translation')).toBe('localized:zh-CN:common.save');
      expect(defaulted.getByTestId('context-probe-defaulted').getAttribute('data-translation')).toBe('Save');
    });

    await fireEvent.click(localized.getByTestId('change-locale-localized'));
    await waitFor(() => {
      expect(localized.getByTestId('context-probe-localized').getAttribute('data-locale')).toBe('en');
      expect(localized.getByTestId('bound-locale-localized').textContent).toBe('en');
    });
  });

  it('runs navigation guards and synchronizes only the router state owned by the target tree', async () => {
    const beforeGuard = vi.fn(() => true);
    const afterGuard = vi.fn();
    const removeBefore = registerBeforeEach(beforeGuard);
    const removeAfter = registerAfterEach(afterGuard);

    const first = renderComponent(ContextHost, {
      instance: 'nav-first',
      dataProvider: createDataProvider('nav-first'),
      routerProvider: createRouterProvider('nav-first'),
      resources: [createResource('nav-first')],
    });
    const second = renderComponent(ContextHost, {
      instance: 'nav-second',
      dataProvider: createDataProvider('nav-second'),
      routerProvider: createRouterProvider('nav-second'),
      resources: [createResource('nav-second')],
    });

    try {
      await fireEvent.click(first.getByTestId('navigate-nav-first'));

      await waitFor(() => {
        expect(first.getByTestId('context-probe-nav-first').getAttribute('data-route-scope')).toBe('nav-first');
      });
      expect(second.getByTestId('context-probe-nav-second').getAttribute('data-route')).toBe('/');
      expect(second.getByTestId('context-probe-nav-second').getAttribute('data-route-scope')).toBe('none');
      expect(beforeGuard).toHaveBeenCalledWith('/?scope=nav-first', '/?instance=nav-first');
      expect(afterGuard).toHaveBeenCalledWith('/?scope=nav-first', '/?instance=nav-first');
    } finally {
      removeBefore();
      removeAfter();
    }
  });

  it('keeps auth redirects behind navigation guards', async () => {
    const router = createRouterProvider('guarded-auth');
    const beforeGuard = vi.fn(() => false);
    const afterGuard = vi.fn();
    const removeBefore = registerBeforeEach(beforeGuard);
    const removeAfter = registerAfterEach(afterGuard);
    const authProvider = createAuthProvider('guarded-auth');
    authProvider.check = vi.fn(async () => ({ authenticated: false, redirectTo: '/login' }));

    try {
      renderComponent(ContextHost, {
        instance: 'guarded-auth',
        dataProvider: createDataProvider('guarded-auth'),
        authProvider,
        routerProvider: router,
        resources: [createResource('guarded-auth')],
      });

      await waitFor(() => expect(authProvider.check).toHaveBeenCalled());
      await waitFor(() => expect(beforeGuard).toHaveBeenCalledWith('/login', '/?instance=guarded-auth'));
      expect(router.parse().pathname).toBe('/');
      expect(afterGuard).not.toHaveBeenCalled();
    } finally {
      removeBefore();
      removeAfter();
    }
  });

  it('registers reactive document theme owners and restores the previous owner on destroy', async () => {
    const first = renderComponent(ContextHost, {
      instance: 'theme-first',
      dataProvider: createDataProvider('theme-first'),
      routerProvider: createRouterProvider('theme-first'),
      resources: [createResource('theme-first')],
      defaultTheme: 'dark',
      themeConfig: { cssOverrides: { '--admin-owner': 'first' } },
    });

    await waitFor(() => {
      expect(getTheme()).toBe('dark');
      expect(document.documentElement.style.getPropertyValue('--admin-owner')).toBe('first');
    });

    const second = renderComponent(ContextHost, {
      instance: 'theme-second',
      dataProvider: createDataProvider('theme-second'),
      routerProvider: createRouterProvider('theme-second'),
      resources: [createResource('theme-second')],
    });

    await waitFor(() => {
      expect(getTheme()).toBe('dark');
      expect(document.documentElement.style.getPropertyValue('--admin-owner')).toBe('first');
    });

    await second.rerender({
      instance: 'theme-second',
      dataProvider: createDataProvider('theme-second'),
      routerProvider: createRouterProvider('theme-second'),
      resources: [createResource('theme-second')],
      defaultTheme: 'light',
      themeConfig: {
        layoutPreset: 'clean-flat',
        cssOverrides: { '--admin-owner': 'second' },
      },
    });

    await waitFor(() => {
      expect(getTheme()).toBe('light');
      expect(document.documentElement.classList.contains('layout-clean-flat')).toBe(true);
      expect(document.documentElement.style.getPropertyValue('--admin-owner')).toBe('second');
    });

    second.unmount();
    await waitFor(() => {
      expect(getTheme()).toBe('dark');
      expect(document.documentElement.classList.contains('layout-clean-flat')).toBe(false);
      expect(document.documentElement.style.getPropertyValue('--admin-owner')).toBe('first');
    });

    first.unmount();
    await waitFor(() => {
      expect(getTheme()).toBe('system');
      expect(document.documentElement.style.getPropertyValue('--admin-owner')).toBe('');
    });
  });

  it('routes real access, audit, and chat consumers through each mounted provider bundle', async () => {
    const firstProviders = createConsumerProviderBundle('consumer-first');
    const secondProviders = createConsumerProviderBundle('consumer-second');
    const persistCallback = vi.fn();
    const firstPanelAKey = scopedChatStorageKey(
      'https://consumer-first.example.test',
      'tenant-first',
      'consumer-first-panel-a',
    );
    const firstPanelBKey = scopedChatStorageKey(
      'https://consumer-first.example.test',
      'tenant-first',
      'consumer-first-panel-b',
    );
    testLocalStorage.setItem(firstPanelAKey, JSON.stringify([{
      id: 'panel-a-seed',
      role: 'user',
      content: 'panel a seed',
      timestamp: 1,
    }]));
    testLocalStorage.setItem(firstPanelBKey, JSON.stringify([{
      id: 'panel-b-seed',
      role: 'user',
      content: 'panel b seed',
      timestamp: 1,
    }]));
    const directChatSend = vi.fn(async (
      _messages: Parameters<ChatProvider['sendMessage']>[0],
      _options?: Parameters<ChatProvider['sendMessage']>[1],
    ) => 'direct-reply');
    const firstResource = createResource('consumer-first');
    firstResource.provider = { meta: { resourceScope: 'first' } };
    const secondResource = createResource('consumer-second');
    secondResource.provider = { meta: { resourceScope: 'second' } };

    const firstProps = {
      instance: 'consumer-first',
      providerBundle: { ...firstProviders.bundle, agentProvider: null },
      chatProvider: { sendMessage: directChatSend },
      routerProvider: createRouterProvider('consumer-first'),
      resources: [firstResource],
      tenant: { tenantId: 'tenant-first', meta: { tenantScope: 'first' } },
      consumerProbe: true,
      explicitChatPersistKeys: ['consumer-first-panel-a', 'consumer-first-panel-b'] as const,
      chatPersistProbe: {
        key: 'consumer-first-callback-panel',
        onPersist: persistCallback,
      },
    };
    let first = renderComponent(ContextHost, firstProps);
    const second = renderComponent(ContextHost, {
      instance: 'consumer-second',
      providerBundle: secondProviders.bundle,
      routerProvider: createRouterProvider('consumer-second'),
      resources: [secondResource],
      tenant: { tenantId: 'tenant-second', meta: { tenantScope: 'second' } },
      consumerProbe: true,
    });

    await waitFor(() => {
      expect(firstProviders.accessCan).toHaveBeenCalled();
      expect(secondProviders.accessCan).toHaveBeenCalled();
      expect(firstProviders.auditGet).toHaveBeenCalled();
      expect(secondProviders.auditGet).toHaveBeenCalled();
    });

    for (const [request] of firstProviders.accessCan.mock.calls) {
      const requests = Array.isArray(request) ? request : [request];
      expect(requests.every(({ resource }) => resource === 'consumer-first-resource')).toBe(true);
    }
    for (const [request] of secondProviders.accessCan.mock.calls) {
      const requests = Array.isArray(request) ? request : [request];
      expect(requests.every(({ resource }) => resource === 'consumer-second-resource')).toBe(true);
    }
    expect(firstProviders.auditGet).toHaveBeenCalledWith({
      resource: 'consumer-first-resource',
      meta: {
        resourceScope: 'first',
        recordId: 0,
        tenantScope: 'first',
        tenantId: 'tenant-first',
      },
    });
    expect(secondProviders.auditGet).toHaveBeenCalledWith({
      resource: 'consumer-second-resource',
      meta: {
        resourceScope: 'second',
        recordId: 0,
        tenantScope: 'second',
        tenantId: 'tenant-second',
      },
    });

    await fireEvent.click(within(first.getByTestId('insight-consumer-first')).getByRole('button'));
    await fireEvent.click(within(second.getByTestId('insight-consumer-second')).getByRole('button'));
    await waitFor(() => {
      expect(directChatSend).toHaveBeenCalledTimes(1);
      expect(secondProviders.chatSend).toHaveBeenCalledTimes(1);
    });
    expect(firstProviders.chatSend).not.toHaveBeenCalled();
    expect(directChatSend.mock.calls[0]?.[0]?.[0]?.content).toContain('consumer-first-context');
    expect(secondProviders.chatSend.mock.calls[0]?.[0]?.[0]?.content).toContain('consumer-second-context');

    let firstPanel = await findScopedElement(
      first.getByTestId('explicit-chat-consumer-first-first'),
      '[data-svadmin-chat-scope]',
    );
    let secondPanel = await findScopedElement(
      first.getByTestId('explicit-chat-consumer-first-second'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(firstPanel).getByRole('button'));
    await fireEvent.click(within(secondPanel).getByRole('button'));
    expect(await within(firstPanel).findByText('panel a seed')).toBeTruthy();
    expect(await within(secondPanel).findByText('panel b seed')).toBeTruthy();
    const firstPanelInput = await within(firstPanel).findByRole('textbox');
    const secondPanelInput = await within(secondPanel).findByRole('textbox');
    await fireEvent.input(firstPanelInput, { target: { value: 'panel a history' } });
    await fireEvent.keyDown(firstPanelInput, { key: 'Enter' });
    await fireEvent.input(secondPanelInput, { target: { value: 'panel b history' } });
    await fireEvent.keyDown(secondPanelInput, { key: 'Enter' });
    expect(await within(firstPanel).findByText('panel a history')).toBeTruthy();
    expect(await within(secondPanel).findByText('panel b history')).toBeTruthy();
    expect(within(firstPanel).queryByText('panel b history')).toBeNull();
    expect(within(secondPanel).queryByText('panel a history')).toBeNull();

    first.unmount();
    first = renderComponent(ContextHost, firstProps);
    firstPanel = await findScopedElement(
      await first.findByTestId('explicit-chat-consumer-first-first'),
      '[data-svadmin-chat-scope]',
    );
    secondPanel = await findScopedElement(
      await first.findByTestId('explicit-chat-consumer-first-second'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(firstPanel).getByRole('button'));
    await fireEvent.click(within(secondPanel).getByRole('button'));
    expect(await within(firstPanel).findByText('panel a history')).toBeTruthy();
    expect(await within(secondPanel).findByText('panel b history')).toBeTruthy();
    expect(within(firstPanel).queryByText('panel b history')).toBeNull();
    expect(within(secondPanel).queryByText('panel a history')).toBeNull();

    await fireEvent.click(within(firstPanel).getByRole('button', { name: /clear/i }));
    expect(within(firstPanel).queryByText('panel a history')).toBeNull();
    expect(within(secondPanel).getByText('panel b history')).toBeTruthy();

    first.unmount();
    first = renderComponent(ContextHost, firstProps);
    firstPanel = await findScopedElement(
      await first.findByTestId('explicit-chat-consumer-first-first'),
      '[data-svadmin-chat-scope]',
    );
    secondPanel = await findScopedElement(
      await first.findByTestId('explicit-chat-consumer-first-second'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(firstPanel).getByRole('button'));
    await fireEvent.click(within(secondPanel).getByRole('button'));
    expect(await within(secondPanel).findByText('panel b history')).toBeTruthy();
    expect(within(firstPanel).queryByText('panel a history')).toBeNull();
    expect(within(firstPanel).queryByText('panel b history')).toBeNull();

    const callbackPanel = await findScopedElement(
      first.getByTestId('persist-callback-chat-consumer-first'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(callbackPanel).getByRole('button'));
    const callbackInput = await within(callbackPanel).findByRole('textbox');
    await fireEvent.input(callbackInput, { target: { value: 'callback panel history' } });
    await fireEvent.keyDown(callbackInput, { key: 'Enter' });
    await waitFor(() => {
      expect(persistCallback).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ content: 'callback panel history' }),
      ]));
    }, { timeout: 2_000 });
    await fireEvent.click(within(callbackPanel).getByRole('button', { name: /clear/i }));
    expect(persistCallback).toHaveBeenLastCalledWith([]);

    let resolveOldReply!: (reply: string) => void;
    let resolveFreshReply!: (reply: string) => void;
    const oldReply = new Promise<string>((resolve) => { resolveOldReply = resolve; });
    const freshReply = new Promise<string>((resolve) => { resolveFreshReply = resolve; });
    let delayedCallCount = 0;
    const delayedPersistCallback = vi.fn((_messages: ChatMessage[]) => undefined);
    const delayedChatSend = vi.fn((
      _messages: Parameters<ChatProvider['sendMessage']>[0],
      _options?: Parameters<ChatProvider['sendMessage']>[1],
    ) => delayedCallCount++ === 0 ? oldReply : freshReply);
    const delayedProviders = createConsumerProviderBundle('consumer-delayed');
    const delayed = renderComponent(ContextHost, {
      instance: 'consumer-delayed',
      providerBundle: { ...delayedProviders.bundle, agentProvider: null },
      chatProvider: { sendMessage: delayedChatSend },
      routerProvider: createRouterProvider('consumer-delayed'),
      resources: [createResource('consumer-delayed')],
      tenant: { tenantId: 'tenant-delayed' },
      chatPersistProbe: {
        key: 'consumer-delayed-panel',
        onPersist: delayedPersistCallback,
      },
    });
    const delayedPanel = await findScopedElement(
      await delayed.findByTestId('persist-callback-chat-consumer-delayed'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(delayedPanel).getByRole('button'));
    const delayedInput = await within(delayedPanel).findByRole('textbox') as HTMLTextAreaElement;
    await fireEvent.input(delayedInput, { target: { value: 'old delayed request' } });
    await fireEvent.keyDown(delayedInput, { key: 'Enter' });
    await waitFor(() => expect(delayedChatSend).toHaveBeenCalledTimes(1));
    await fireEvent.click(within(delayedPanel).getByRole('button', { name: /clear/i }));
    expect(delayedChatSend.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(delayedPersistCallback).toHaveBeenLastCalledWith([]);

    await fireEvent.input(delayedInput, { target: { value: 'fresh delayed request' } });
    await fireEvent.keyDown(delayedInput, { key: 'Enter' });
    await waitFor(() => expect(delayedChatSend).toHaveBeenCalledTimes(2));
    expect(delayedInput.disabled).toBe(true);

    resolveOldReply('stale delayed reply');
    await oldReply;
    await tick();
    expect(within(delayedPanel).queryByText('stale delayed reply')).toBeNull();
    expect(delayedInput.disabled).toBe(true);

    resolveFreshReply('fresh delayed reply');
    await freshReply;
    await tick();
    expect(await within(delayedPanel).findByText('fresh delayed reply')).toBeTruthy();
    expect(delayedInput.disabled).toBe(false);
    await waitFor(() => {
      expect(delayedPersistCallback).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ content: 'fresh delayed reply' }),
      ]));
      expect(delayedPersistCallback.mock.calls.every(([persistedMessages]) => (
        persistedMessages.every(({ content }) => content !== 'stale delayed reply')
      ))).toBe(true);
    }, { timeout: 2_000 });
  });

  it('flushes pending chat persistence through the callback captured before a key rerender', async () => {
    const providers = createConsumerProviderBundle('persist-rerender');
    const persistA = vi.fn((_messages: ChatMessage[]) => undefined);
    const persistB = vi.fn((_messages: ChatMessage[]) => undefined);
    let chatCallCount = 0;
    const chatSend = vi.fn((
      _messages: Parameters<ChatProvider['sendMessage']>[0],
      _options?: Parameters<ChatProvider['sendMessage']>[1],
    ) => {
      chatCallCount++;
      return chatCallCount === 2
        ? Promise.resolve('callback b reply')
        : new Promise<string>(() => {});
    });
    const chatProvider = { sendMessage: chatSend };
    const routerProvider = createRouterProvider('persist-rerender');
    const resources = [createResource('persist-rerender')];
    const providerBundle = { ...providers.bundle, agentProvider: null };
    const view = renderComponent(ContextHost, {
      instance: 'persist-rerender',
      providerBundle,
      chatProvider,
      routerProvider,
      resources,
      tenant: { tenantId: 'tenant-persist-rerender' },
      chatPersistProbe: { key: 'persist-key-a', onPersist: persistA },
    });
    const panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-persist-rerender'),
      '[data-svadmin-chat-scope]',
    );

    await fireEvent.click(within(panel).getByRole('button'));
    let panelInput = await within(panel).findByRole('textbox') as HTMLTextAreaElement;
    await fireEvent.input(panelInput, { target: { value: 'pending for callback a' } });
    await fireEvent.keyDown(panelInput, { key: 'Enter' });
    expect(persistA.mock.calls.some(([messages]) => (
      messages.some(({ content }) => content === 'pending for callback a')
    ))).toBe(false);

    await view.rerender({
      instance: 'persist-rerender',
      providerBundle,
      chatProvider,
      routerProvider,
      resources,
      tenant: { tenantId: 'tenant-persist-rerender' },
      chatPersistProbe: { key: 'persist-key-b', onPersist: persistB },
    });
    await waitFor(() => {
      expect(persistA).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ content: 'pending for callback a' }),
      ]));
    });
    expect(persistB.mock.calls.every(([messages]) => (
      messages.every(({ content }) => content !== 'pending for callback a')
    ))).toBe(true);

    const rerenderedPanel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-persist-rerender'),
      '[data-svadmin-chat-scope]',
    );
    panelInput = await within(rerenderedPanel).findByRole('textbox') as HTMLTextAreaElement;
    await waitFor(() => expect(panelInput.disabled).toBe(false));
    await fireEvent.input(panelInput, { target: { value: 'pending for callback b' } });
    await fireEvent.keyDown(panelInput, { key: 'Enter' });
    await waitFor(() => {
      expect(persistB).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ content: 'pending for callback b' }),
      ]));
    }, { timeout: 2_000 });
    expect(persistA.mock.calls.every(([messages]) => (
      messages.every(({ content }) => content !== 'pending for callback b')
    ))).toBe(true);

    await waitFor(() => expect(chatSend).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(panelInput.disabled).toBe(false));
    await fireEvent.input(panelInput, { target: { value: 'pending before tenant switch' } });
    await fireEvent.keyDown(panelInput, { key: 'Enter' });
    await waitFor(() => expect(chatSend).toHaveBeenCalledTimes(3));
    await view.rerender({
      instance: 'persist-rerender',
      providerBundle,
      chatProvider,
      routerProvider,
      resources,
      tenant: { tenantId: 'tenant-persist-rerender-next' },
      chatPersistProbe: { key: 'persist-key-b', onPersist: persistB },
    });
    await waitFor(() => {
      expect(chatSend.mock.calls[2]?.[1]?.signal?.aborted).toBe(true);
    });
  });

  it('does not send approval history from an old scope to a replacement persistence callback', async () => {
    const agent = createApprovalAgent('scope-sink');
    const persistA = vi.fn((_messages: ChatMessage[]) => undefined);
    const persistB = vi.fn((_messages: ChatMessage[]) => undefined);
    const providerBundle: AdminProviderBundle = {
      ...createProviderBundle('approval-sink-scope', createDataProvider('approval-sink-scope')),
      chatProvider: null,
      agentProvider: agent.provider,
    };
    const baseProps = {
      instance: 'approval-sink-scope',
      providerBundle,
      routerProvider: createRouterProvider('approval-sink-scope'),
      resources: [createResource('approval-sink-scope')],
    };
    const view = renderComponent(ContextHost, {
      ...baseProps,
      tenant: { tenantId: 'approval-sink-a' },
      chatPersistProbe: { key: 'approval-panel-a', onPersist: persistA },
    });
    const panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-approval-sink-scope'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(panel).getByRole('button'));
    const input = await within(panel).findByRole('textbox');
    await fireEvent.input(input, { target: { value: 'approval history owned by scope a' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(await within(panel).findByRole('button', { name: /scope-sink approval/ })).toBeTruthy();
    await waitFor(() => {
      expect(persistA.mock.calls.some(([messages]) => (
        messages.some(({ content }) => content === 'approval history owned by scope a')
      ))).toBe(true);
    });

    await view.rerender({
      ...baseProps,
      tenant: { tenantId: 'approval-sink-b' },
      chatPersistProbe: { key: 'approval-panel-b', onPersist: persistB },
    });
    view.unmount();

    expect(persistB.mock.calls.every(([messages]) => (
      messages.every(({ content }) => content !== 'approval history owned by scope a')
    ))).toBe(true);
    expect(agent.approveToolCall).not.toHaveBeenCalled();
  });

  it('keeps legacy provider facades working when consumers render without an AdminApp scope', async () => {
    const chatSend = vi.fn(async () => 'legacy-reply');
    const auditGet = vi.fn(async () => []);
    const accessCan = vi.fn(async () => ({ can: true }));
    setChatProvider({ sendMessage: chatSend });
    setAuditLogProvider({
      create: async () => ({ timestamp: '', action: 'create' as const }),
      get: auditGet,
      update: async () => ({ timestamp: '', action: 'update' as const }),
    });
    setAccessControlProvider({ can: accessCan });
    setResources([createResource('legacy')]);

    const insight = renderComponent(InsightCard, {
      props: {
        context: 'legacy-context',
        autoFetch: false,
      },
    });
    renderComponent(AuditLogDrawer, {
      props: {
        open: true,
        resource: 'legacy-resource',
        recordId: 0,
      },
    });
    renderComponent(Sidebar, {
      props: {
        collapsed: false,
        identity: null,
        title: 'Legacy Admin',
        onToggle: vi.fn(),
        onLogout: vi.fn(),
      },
    });

    await fireEvent.click(within(insight.container).getByRole('button'));
    await waitFor(() => {
      expect(chatSend).toHaveBeenCalledTimes(1);
      expect(auditGet).toHaveBeenCalledWith({
        resource: 'legacy-resource',
        meta: { recordId: 0 },
      });
      expect(accessCan).toHaveBeenCalled();
    });
  });

  it('targets ask-ai and keyboard shortcuts to one Layout and isolates tenant persistence', async () => {
    const firstProviders = createConsumerProviderBundle('event-first');
    const secondProviders = createConsumerProviderBundle('event-second');
    const firstBundle = { ...firstProviders.bundle, agentProvider: null };
    const secondBundle = { ...secondProviders.bundle, agentProvider: null };
    const first = renderComponent(ContextHost, {
      instance: 'event-first',
      providerBundle: firstBundle,
      routerProvider: createRouterProvider('event-first'),
      resources: [createResource('event-first')],
      tenant: { tenantId: 'event-tenant-first' },
    });
    const second = renderComponent(ContextHost, {
      instance: 'event-second',
      providerBundle: secondBundle,
      routerProvider: createRouterProvider('event-second'),
      resources: [createResource('event-second')],
      tenant: { tenantId: 'event-tenant-second' },
    });

    const firstChat = await findScopedElement(first.container, '[data-svadmin-chat-scope]');
    const secondChat = await findScopedElement(second.container, '[data-svadmin-chat-scope]');
    const firstLayout = firstChat.closest<HTMLElement>('[data-svadmin-layout-scope]');
    const secondLayout = secondChat.closest<HTMLElement>('[data-svadmin-layout-scope]');
    expect(firstLayout).not.toBeNull();
    expect(secondLayout).not.toBeNull();
    expect(firstLayout).not.toBe(secondLayout);
    const firstShortcutTarget = firstLayout?.querySelector<HTMLElement>('a[href], button, input, textarea, [tabindex]');
    expect(firstShortcutTarget).not.toBeNull();
    firstShortcutTarget?.focus();
    expect(firstLayout?.contains(document.activeElement)).toBe(true);

    await fireEvent.keyDown(firstShortcutTarget as HTMLElement, { key: 'L', ctrlKey: true, shiftKey: true });
    await waitFor(() => expect(firstChat.dataset.svadminChatVisible).toBe('true'));
    expect(secondChat.dataset.svadminChatVisible).toBe('false');

    const firstScope = firstChat.dataset.svadminChatScope;
    const secondScope = secondChat.dataset.svadminChatScope;
    window.dispatchEvent(new CustomEvent('svadmin:ask-ai', {
      detail: { query: 'first scoped question', scope: firstScope },
    }));
    await waitFor(() => expect(firstProviders.chatSend).toHaveBeenCalledTimes(1));
    expect(secondProviders.chatSend).not.toHaveBeenCalled();

    window.dispatchEvent(new CustomEvent('svadmin:ask-ai', {
      detail: { query: 'second scoped question', scope: secondScope },
    }));
    await waitFor(() => expect(secondProviders.chatSend).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new CustomEvent('svadmin:ask-ai', { detail: 'legacy untargeted question' }));
    await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
    expect(firstProviders.chatSend).toHaveBeenCalledTimes(1);
    expect(secondProviders.chatSend).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      const keys = Array.from({ length: testLocalStorage.length }, (_, index) => testLocalStorage.key(index))
        .filter((key): key is string => key?.startsWith('svadmin-chat:') ?? false);
      expect(keys).toHaveLength(2);
      const payloads = keys.map((key) => testLocalStorage.getItem(key) ?? '');
      expect(payloads.some((payload) => payload.includes('first scoped question'))).toBe(true);
      expect(payloads.some((payload) => payload.includes('second scoped question'))).toBe(true);
      expect(new Set(keys).size).toBe(2);
    }, { timeout: 2_000 });
  });

  it('restores the default chat history after remounting the same API and tenant', async () => {
    const providers = createConsumerProviderBundle('persist-remount');
    const bundle = { ...providers.bundle, agentProvider: null };
    const renderPersistentHost = () => renderComponent(ContextHost, {
      instance: 'persist-remount',
      providerBundle: bundle,
      routerProvider: createRouterProvider('persist-remount'),
      resources: [createResource('persist-remount')],
      tenant: { tenantId: 'stable-tenant' },
    });

    const first = renderPersistentHost();
    const firstChat = await findScopedElement(first.container, '[data-svadmin-chat-scope]');
    window.dispatchEvent(new CustomEvent('svadmin:ask-ai', {
      detail: {
        query: 'restore this conversation',
        scope: firstChat.dataset.svadminChatScope,
      },
    }));
    await waitFor(() => {
      const keys = Array.from({ length: testLocalStorage.length }, (_, index) => testLocalStorage.key(index))
        .filter((key): key is string => key?.startsWith('svadmin-chat:') ?? false);
      expect(keys).toHaveLength(1);
      expect(keys[0]).toBe(scopedChatStorageKey(
        'https://persist-remount.example.test',
        'stable-tenant',
      ));
      expect(testLocalStorage.getItem(keys[0])).toContain('restore this conversation');
    }, { timeout: 2_000 });
    first.unmount();

    const second = renderPersistentHost();
    const secondChat = await findScopedElement(second.container, '[data-svadmin-chat-scope]');
    await fireEvent.click(within(secondChat).getByRole('button'));
    expect(await within(secondChat).findByText('restore this conversation')).toBeTruthy();
  });

  it('scopes an explicit panel key by backend and typed tenant across rerenders', async () => {
    const providers = createConsumerProviderBundle('explicit-tenant-scope');
    const providerBundle = { ...providers.bundle, agentProvider: null };
    const baseProps = {
      instance: 'explicit-tenant-scope',
      providerBundle,
      routerProvider: createRouterProvider('explicit-tenant-scope'),
      resources: [createResource('explicit-tenant-scope')],
      chatPersistProbe: { key: 'shared-panel' },
    };
    const view = renderComponent(ContextHost, {
      ...baseProps,
      tenant: { tenantId: 1 },
    });
    let panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-explicit-tenant-scope'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(panel).getByRole('button'));
    let input = await within(panel).findByRole('textbox');
    await fireEvent.input(input, { target: { value: 'tenant a panel history' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(await within(panel).findByText('tenant a panel history')).toBeTruthy();
    await waitFor(() => expect((input as HTMLTextAreaElement).disabled).toBe(false));

    await view.rerender({
      ...baseProps,
      tenant: { tenantId: '1' },
    });
    panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-explicit-tenant-scope'),
      '[data-svadmin-chat-scope]',
    );
    await waitFor(() => expect(within(panel).queryByText('tenant a panel history')).toBeNull());
    input = await within(panel).findByRole('textbox');
    await fireEvent.input(input, { target: { value: 'tenant b panel history' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(await within(panel).findByText('tenant b panel history')).toBeTruthy();
    await waitFor(() => expect((input as HTMLTextAreaElement).disabled).toBe(false));

    await view.rerender({
      ...baseProps,
      tenant: { tenantId: 1 },
    });
    panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-explicit-tenant-scope'),
      '[data-svadmin-chat-scope]',
    );
    expect(await within(panel).findByText('tenant a panel history')).toBeTruthy();
    expect(within(panel).queryByText('tenant b panel history')).toBeNull();
    expect(testLocalStorage.getItem('shared-panel')).toBeNull();
  });

  it('resets non-persistent chat history when its tenant scope changes', async () => {
    const providers = createConsumerProviderBundle('disabled-persist-scope');
    const baseProps = {
      instance: 'disabled-persist-scope',
      routerProvider: createRouterProvider('disabled-persist-scope'),
      resources: [createResource('disabled-persist-scope')],
      chatPersistProbe: { key: '' },
    };
    const view = renderComponent(ContextHost, {
      ...baseProps,
      providerBundle: { ...providers.bundle, agentProvider: null },
      tenant: { tenantId: 'disabled-persist-tenant-a' },
    });
    let panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-disabled-persist-scope'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(panel).getByRole('button'));
    let input = await within(panel).findByRole('textbox');
    await fireEvent.input(input, { target: { value: 'private scope a history' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(providers.chatSend).toHaveBeenCalledTimes(1));
    expect(await within(panel).findByText('private scope a history')).toBeTruthy();

    await view.rerender({
      ...baseProps,
      providerBundle: { ...providers.bundle, agentProvider: null },
      tenant: { tenantId: 'disabled-persist-tenant-b' },
    });
    panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-disabled-persist-scope'),
      '[data-svadmin-chat-scope]',
    );
    await waitFor(() => expect(within(panel).queryByText('private scope a history')).toBeNull());
    input = await within(panel).findByRole('textbox');
    await fireEvent.input(input, { target: { value: 'scope b question' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(providers.chatSend).toHaveBeenCalledTimes(2));
    expect(providers.chatSend.mock.calls[1]?.[0]?.some(({ content }) => (
      content === 'private scope a history'
    ))).toBe(false);
  });

  it('reruns a custom restore callback when an explicit panel changes tenant scope', async () => {
    const providers = createConsumerProviderBundle('custom-restore-scope');
    const providerBundle = { ...providers.bundle, agentProvider: null };
    const restoreA = vi.fn((): ChatMessage[] => [{
      id: 'custom-restore-a',
      role: 'user',
      content: 'custom tenant a history',
      timestamp: 1,
    }]);
    const restoreB = vi.fn((): ChatMessage[] => [{
      id: 'custom-restore-b',
      role: 'user',
      content: 'custom tenant b history',
      timestamp: 2,
    }]);
    const baseProps = {
      instance: 'custom-restore-scope',
      providerBundle,
      routerProvider: createRouterProvider('custom-restore-scope'),
      resources: [createResource('custom-restore-scope')],
    };
    const view = renderComponent(ContextHost, {
      ...baseProps,
      tenant: { tenantId: 'tenant-a' },
      chatPersistProbe: { key: 'custom-panel', onRestore: restoreA },
    });
    let panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-custom-restore-scope'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(panel).getByRole('button'));
    expect(await within(panel).findByText('custom tenant a history')).toBeTruthy();
    expect(restoreA).toHaveBeenCalledTimes(1);

    await view.rerender({
      ...baseProps,
      tenant: { tenantId: 'tenant-b' },
      chatPersistProbe: { key: 'custom-panel', onRestore: restoreB },
    });
    panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-custom-restore-scope'),
      '[data-svadmin-chat-scope]',
    );
    expect(await within(panel).findByText('custom tenant b history')).toBeTruthy();
    expect(within(panel).queryByText('custom tenant a history')).toBeNull();
    expect(restoreB).toHaveBeenCalledTimes(1);

    await view.rerender({
      ...baseProps,
      tenant: { tenantId: 'tenant-a' },
      chatPersistProbe: { key: 'custom-panel', onRestore: restoreA },
    });
    panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-custom-restore-scope'),
      '[data-svadmin-chat-scope]',
    );
    expect(await within(panel).findByText('custom tenant a history')).toBeTruthy();
    expect(restoreA).toHaveBeenCalledTimes(2);
  });

  it('does not migrate an old exact panel key into a tenant scope', async () => {
    testLocalStorage.setItem('tenant-legacy-panel', JSON.stringify([{
      id: 'tenant-legacy-message',
      role: 'user',
      content: 'must not enter tenant history',
      timestamp: 1,
    }]));
    const providers = createConsumerProviderBundle('tenant-legacy-migration');
    const view = renderComponent(ContextHost, {
      instance: 'tenant-legacy-migration',
      providerBundle: { ...providers.bundle, agentProvider: null },
      routerProvider: createRouterProvider('tenant-legacy-migration'),
      resources: [createResource('tenant-legacy-migration')],
      tenant: { tenantId: 'isolated-tenant' },
      chatPersistProbe: { key: 'tenant-legacy-panel' },
    });
    const panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-tenant-legacy-migration'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(panel).getByRole('button'));
    expect(within(panel).queryByText('must not enter tenant history')).toBeNull();
  });

  it('migrates an old exact panel key only when no tenant is configured', async () => {
    testLocalStorage.setItem('legacy-explicit-panel', JSON.stringify([{
      id: 'legacy-explicit-message',
      role: 'user',
      content: 'legacy explicit panel history',
      timestamp: 1,
    }]));
    const providers = createConsumerProviderBundle('legacy-explicit-migration');
    const view = renderComponent(ContextHost, {
      instance: 'legacy-explicit-migration',
      providerBundle: { ...providers.bundle, agentProvider: null },
      routerProvider: createRouterProvider('legacy-explicit-migration'),
      resources: [createResource('legacy-explicit-migration')],
      chatPersistProbe: { key: 'legacy-explicit-panel' },
    });
    const panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-legacy-explicit-migration'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(panel).getByRole('button'));
    expect(await within(panel).findByText('legacy explicit panel history')).toBeTruthy();
    const physicalKey = scopedChatStorageKey(
      'https://legacy-explicit-migration.example.test',
      undefined,
      'legacy-explicit-panel',
    );
    await waitFor(() => {
      expect(testLocalStorage.getItem(physicalKey)).toContain('legacy explicit panel history');
    }, { timeout: 2_000 });
    expect(testLocalStorage.getItem('legacy-explicit-panel')).toContain('legacy explicit panel history');
  });

  it('filters malformed persisted messages and drops stale persisted actions', async () => {
    const physicalKey = scopedChatStorageKey(
      'https://malformed-history.example.test',
      'malformed-tenant',
      'malformed-panel',
    );
    testLocalStorage.setItem(physicalKey, JSON.stringify([
      {
        id: 'valid-restored-message',
        role: 'assistant',
        content: 'safe restored history',
        timestamp: 1,
        actions: [{
          label: 'stale persisted approval',
          payload: { approvalId: 'stale-approval', approved: true },
        }],
      },
      null,
      { id: 'bad-role', role: 'owner', content: 'invalid role content', timestamp: 2 },
      { id: 3, role: 'user', content: 'invalid id content', timestamp: 3 },
      { id: 'bad-content', role: 'user', content: { nested: true }, timestamp: 4 },
      { id: 'bad-time', role: 'user', content: 'invalid timestamp content', timestamp: '5' },
      {
        id: 'persisted-system-message',
        role: 'system',
        content: 'malicious persisted system instruction',
        timestamp: 6,
      },
      {
        id: 'valid-restored-message',
        role: 'user',
        content: 'duplicate persisted id content',
        timestamp: 7,
      },
    ]));
    const providers = createConsumerProviderBundle('malformed-history');
    const view = renderComponent(ContextHost, {
      instance: 'malformed-history',
      providerBundle: { ...providers.bundle, agentProvider: null },
      routerProvider: createRouterProvider('malformed-history'),
      resources: [createResource('malformed-history')],
      tenant: { tenantId: 'malformed-tenant' },
      chatPersistProbe: { key: 'malformed-panel' },
    });
    const panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-malformed-history'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(panel).getByRole('button'));
    expect(await within(panel).findByText('safe restored history')).toBeTruthy();
    expect(within(panel).queryByRole('button', { name: 'stale persisted approval' })).toBeNull();
    expect(within(panel).queryByText('invalid role content')).toBeNull();
    expect(within(panel).queryByText('invalid id content')).toBeNull();
    expect(within(panel).queryByText('invalid timestamp content')).toBeNull();
    expect(within(panel).queryByText('malicious persisted system instruction')).toBeNull();
    expect(within(panel).queryByText('duplicate persisted id content')).toBeNull();
    const input = await within(panel).findByRole('textbox');
    await fireEvent.input(input, { target: { value: 'question after malformed restore' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(providers.chatSend).toHaveBeenCalledTimes(1));
    expect(providers.chatSend.mock.calls[0]?.[0]?.some(({ content }) => (
      content === 'malicious persisted system instruction'
    ))).toBe(false);
  });

  it('migrates the old unscoped chat key only for a single non-tenant ChatDialog', async () => {
    testLocalStorage.setItem('svadmin-chat', JSON.stringify([{
      id: 'legacy-message',
      role: 'user',
      content: 'legacy history',
      timestamp: 1,
    }]));
    const providers = createConsumerProviderBundle('legacy-migration');
    const renderLegacyHost = () => renderComponent(ContextHost, {
      instance: 'legacy-migration',
      providerBundle: { ...providers.bundle, agentProvider: null },
      routerProvider: createRouterProvider('legacy-migration'),
      resources: [createResource('legacy-migration')],
    });
    const first = renderLegacyHost();
    first.unmount();

    const view = renderLegacyHost();
    const chatRoot = await findScopedElement(view.container, '[data-svadmin-chat-scope]');
    await fireEvent.click(within(chatRoot).getByRole('button'));
    expect(await within(chatRoot).findByText('legacy history')).toBeTruthy();
    await waitFor(() => {
      const migratedKeys = Array.from({ length: testLocalStorage.length }, (_, index) => testLocalStorage.key(index))
        .filter((key): key is string => key?.startsWith('svadmin-chat:') ?? false);
      expect(migratedKeys).toHaveLength(1);
      expect(migratedKeys[0]).toBe(scopedChatStorageKey(
        'https://legacy-migration.example.test',
        undefined,
      ));
      expect(testLocalStorage.getItem(migratedKeys[0])).toContain('legacy history');
    }, { timeout: 2_000 });
    expect(testLocalStorage.getItem('svadmin-chat')).toContain('legacy history');
  });

  it('keeps identical approval ids local to their owning ChatDialog', async () => {
    const firstAgent = createApprovalAgent('first-agent');
    const secondAgent = createApprovalAgent('second-agent');
    const firstBundle: AdminProviderBundle = {
      ...createProviderBundle('approval-first', createDataProvider('approval-first')),
      chatProvider: null,
      agentProvider: firstAgent.provider,
    };
    const secondBundle: AdminProviderBundle = {
      ...createProviderBundle('approval-second', createDataProvider('approval-second')),
      chatProvider: null,
      agentProvider: secondAgent.provider,
    };
    const first = renderComponent(ContextHost, {
      instance: 'approval-first',
      providerBundle: firstBundle,
      routerProvider: createRouterProvider('approval-first'),
      resources: [createResource('approval-first')],
      tenant: { tenantId: 'approval-tenant-first' },
    });
    const second = renderComponent(ContextHost, {
      instance: 'approval-second',
      providerBundle: secondBundle,
      routerProvider: createRouterProvider('approval-second'),
      resources: [createResource('approval-second')],
      tenant: { tenantId: 'approval-tenant-second' },
    });

    const firstChatRoot = await findScopedElement(first.container, '[data-svadmin-chat-scope]');
    const secondChatRoot = await findScopedElement(second.container, '[data-svadmin-chat-scope]');
    await fireEvent.click(within(firstChatRoot).getByRole('button'));
    await fireEvent.click(within(secondChatRoot).getByRole('button'));
    const firstInput = await within(firstChatRoot).findByRole('textbox');
    const secondInput = await within(secondChatRoot).findByRole('textbox');
    await fireEvent.input(firstInput, { target: { value: 'approve first' } });
    await fireEvent.keyDown(firstInput, { key: 'Enter' });
    await fireEvent.input(secondInput, { target: { value: 'approve second' } });
    await fireEvent.keyDown(secondInput, { key: 'Enter' });

    const firstApprove = await within(firstChatRoot).findByRole('button', { name: /first-agent approval/ });
    const secondApprove = await within(secondChatRoot).findByRole('button', { name: /second-agent approval/ });
    await fireEvent.click(firstApprove);
    expect(firstAgent.approveToolCall).toHaveBeenCalledWith('shared-approval-id', true);
    expect(secondAgent.approveToolCall).not.toHaveBeenCalled();

    await fireEvent.click(secondApprove);
    expect(secondAgent.approveToolCall).toHaveBeenCalledWith('shared-approval-id', true);
    expect(firstAgent.approveToolCall).toHaveBeenCalledTimes(1);
  });

  it('preserves approval confirmations and independent actions while an agent stream continues', async () => {
    let resolveFirstApproval!: () => void;
    let resolveSecondApproval!: () => void;
    const firstApproval = new Promise<void>((resolve) => { resolveFirstApproval = resolve; });
    const secondApproval = new Promise<void>((resolve) => { resolveSecondApproval = resolve; });
    const approveToolCall = vi.fn((id: string) => {
      if (id === 'controlled-approval-1') resolveFirstApproval();
      if (id === 'controlled-approval-2') resolveSecondApproval();
    });
    const chat = vi.fn((..._args: Parameters<AgentProvider['chat']>) => (async function* () {
      yield { type: 'text' as const, content: 'Preparing approvals. ' };
      yield {
        type: 'approval_request' as const,
        id: 'controlled-approval-1',
        tool: 'controlled-tool-one',
        args: {},
        description: 'first controlled approval',
      };
      yield {
        type: 'approval_request' as const,
        id: 'controlled-approval-2',
        tool: 'controlled-tool-two',
        args: {},
        description: 'second controlled approval',
      };
      await firstApproval;
      yield { type: 'text' as const, content: 'Continued after first approval. ' };
      await secondApproval;
      yield { type: 'text' as const, content: 'Finished after second approval.' };
      yield { type: 'done' as const };
    })());
    const agentProvider = { chat, approveToolCall } satisfies AgentProvider;
    const providerBundle: AdminProviderBundle = {
      ...createProviderBundle('controlled-approvals', createDataProvider('controlled-approvals')),
      chatProvider: null,
      agentProvider,
    };
    const view = renderComponent(ContextHost, {
      instance: 'controlled-approvals',
      providerBundle,
      routerProvider: createRouterProvider('controlled-approvals'),
      resources: [createResource('controlled-approvals')],
      tenant: { tenantId: 'controlled-approvals-tenant' },
    });

    const chatRoot = await findScopedElement(view.container, '[data-svadmin-chat-scope]');
    await fireEvent.click(within(chatRoot).getByRole('button'));
    const input = await within(chatRoot).findByRole('textbox');
    await fireEvent.input(input, { target: { value: 'run controlled approvals' } });
    await fireEvent.keyDown(input, { key: 'Enter' });

    const firstApprove = await within(chatRoot).findByRole('button', { name: /first controlled approval/ });
    expect(within(chatRoot).getByRole('button', { name: /second controlled approval/ })).toBeTruthy();
    await fireEvent.click(firstApprove);

    await waitFor(() => {
      expect(approveToolCall).toHaveBeenCalledWith('controlled-approval-1', true);
      expect(within(chatRoot).getByText("User approved execution of tool 'controlled-tool-one'")).toBeTruthy();
      expect(within(chatRoot).getByText(/Continued after first approval/)).toBeTruthy();
    });
    expect(within(chatRoot).queryByRole('button', { name: /first controlled approval/ })).toBeNull();

    const secondApprove = within(chatRoot).getByRole('button', { name: /second controlled approval/ });
    await fireEvent.click(secondApprove);
    await waitFor(() => {
      expect(approveToolCall).toHaveBeenNthCalledWith(2, 'controlled-approval-2', true);
      expect(within(chatRoot).getByText("User approved execution of tool 'controlled-tool-two'")).toBeTruthy();
      expect(within(chatRoot).getByText(/Finished after second approval/)).toBeTruthy();
    });
    expect(within(chatRoot).queryByRole('button', { name: /controlled approval/ })).toBeNull();
  });

  it('revokes pending approvals when a stopped agent ignores its AbortSignal', async () => {
    let continueLateStream!: () => void;
    const lateStreamGate = new Promise<void>((resolve) => { continueLateStream = resolve; });
    const approveToolCall = vi.fn();
    const chat = vi.fn((..._args: Parameters<AgentProvider['chat']>) => (async function* () {
      yield { type: 'text' as const, content: 'Waiting for stoppable approval. ' };
      yield {
        type: 'approval_request' as const,
        id: 'stoppable-approval',
        tool: 'stoppable-tool',
        args: {},
        description: 'stoppable approval action',
      };
      await lateStreamGate;
      yield { type: 'text' as const, content: 'late text after stop' };
      yield {
        type: 'approval_request' as const,
        id: 'late-stoppable-approval',
        tool: 'late-stoppable-tool',
        args: {},
        description: 'late approval after stop',
      };
    })());
    const persistedMessages = vi.fn((_messages: ChatMessage[]) => undefined);
    const providers = createProviderBundle(
      'stoppable-approval',
      createDataProvider('stoppable-approval'),
    );
    const view = renderComponent(ContextHost, {
      instance: 'stoppable-approval',
      providerBundle: {
        ...providers,
        chatProvider: null,
        agentProvider: { chat, approveToolCall },
      },
      routerProvider: createRouterProvider('stoppable-approval'),
      resources: [createResource('stoppable-approval')],
      tenant: { tenantId: 'stoppable-approval-tenant' },
      chatPersistProbe: {
        key: 'stoppable-approval-panel',
        onPersist: persistedMessages,
      },
    });

    const panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-stoppable-approval'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(panel).getByRole('button'));
    const input = await within(panel).findByRole('textbox') as HTMLTextAreaElement;
    await fireEvent.input(input, { target: { value: 'start stoppable approval' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    const approvalButton = await within(panel).findByRole('button', { name: /stoppable approval action/ });
    const stopButton = input.parentElement?.querySelector<HTMLButtonElement>('button');
    expect(stopButton).not.toBeNull();
    await fireEvent.click(stopButton as HTMLButtonElement);

    await waitFor(() => {
      expect(input.disabled).toBe(false);
      expect(within(panel).queryByRole('button', { name: /stoppable approval action/ })).toBeNull();
      const latestPersisted = persistedMessages.mock.calls.at(-1)?.[0] ?? [];
      expect(latestPersisted.every((message) => (
        message.actions?.every((action) => action.payload?.approvalId !== 'stoppable-approval') ?? true
      ))).toBe(true);
    });
    await fireEvent.click(approvalButton);
    expect(approveToolCall).not.toHaveBeenCalled();

    continueLateStream();
    await tick();
    await tick();
    expect(within(panel).queryByText(/late text after stop/)).toBeNull();
    expect(within(panel).queryByRole('button', { name: /late approval after stop/ })).toBeNull();
    expect(approveToolCall).not.toHaveBeenCalled();
  });

  it('flushes the latest plain chat chunk in the same turn that streaming is stopped', async () => {
    let continueLateStream!: () => void;
    const lateStreamGate = new Promise<void>((resolve) => { continueLateStream = resolve; });
    const chatSend = vi.fn((
      _messages: Parameters<ChatProvider['sendMessage']>[0],
      _options?: Parameters<ChatProvider['sendMessage']>[1],
    ) => (async function* () {
      yield 'durable chunk before stop';
      await lateStreamGate;
      yield 'late plain chunk after stop';
    })());
    const persistedMessages = vi.fn((_messages: ChatMessage[]) => undefined);
    const providers = createConsumerProviderBundle('plain-stop-flush');
    const view = renderComponent(ContextHost, {
      instance: 'plain-stop-flush',
      providerBundle: {
        ...providers.bundle,
        chatProvider: { sendMessage: chatSend },
        agentProvider: null,
      },
      routerProvider: createRouterProvider('plain-stop-flush'),
      resources: [createResource('plain-stop-flush')],
      tenant: { tenantId: 'plain-stop-flush-tenant' },
      chatPersistProbe: {
        key: 'plain-stop-flush-panel',
        onPersist: persistedMessages,
      },
    });

    const panel = await findScopedElement(
      await view.findByTestId('persist-callback-chat-plain-stop-flush'),
      '[data-svadmin-chat-scope]',
    );
    await fireEvent.click(within(panel).getByRole('button'));
    const input = await within(panel).findByRole('textbox') as HTMLTextAreaElement;
    await fireEvent.input(input, { target: { value: 'start plain stream' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(await within(panel).findByText(/durable chunk before stop/)).toBeTruthy();
    const stopButton = input.parentElement?.querySelector<HTMLButtonElement>('button');
    expect(stopButton).not.toBeNull();
    await fireEvent.click(stopButton as HTMLButtonElement);

    const latestPersisted = persistedMessages.mock.calls.at(-1)?.[0] ?? [];
    expect(latestPersisted.some(({ content }) => content.includes('durable chunk before stop'))).toBe(true);
    expect(chatSend.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);

    continueLateStream();
    await tick();
    await tick();
    expect(within(panel).queryByText(/late plain chunk after stop/)).toBeNull();
  });

});
