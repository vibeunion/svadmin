<script lang="ts">
  import {
    getAuthProvider,
    captureAdminContext,
    getDataProvider,
    getResources,
    getRouterProvider,
    getTaskProvider,
  } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { getRouterState } from '../router-state.svelte.js';

  interface Props {
    instance: string;
    nextLocale: string;
  }

  let { instance, nextLocale }: Props = $props();

  const translation = useTranslation();
  const adminContext = captureAdminContext();
  const routerState = getRouterState();
  const providerUrl = $derived(getDataProvider().getApiUrl());
  const providerNames = $derived(adminContext.getDataProviderNames().join(','));
  const resourceProviderUrl = $derived.by(() => {
    try {
      return adminContext.getDataProviderForResource(`${instance}-resource`).getApiUrl();
    } catch {
      return 'none';
    }
  });
  const liveId = $derived(String(Reflect.get(adminContext.liveProvider ?? {}, '__testId') ?? 'none'));
  const accessId = $derived(String(Reflect.get(adminContext.accessControlProvider ?? {}, '__testId') ?? 'none'));
  const auditId = $derived(String(Reflect.get(adminContext.auditLogProvider ?? {}, '__testId') ?? 'none'));
  const notificationId = $derived(String(Reflect.get(adminContext.notificationProvider ?? {}, '__testId') ?? 'none'));
  const chatId = $derived(String(Reflect.get(adminContext.chatProvider ?? {}, '__testId') ?? 'none'));
  const agentId = $derived(String(Reflect.get(adminContext.agentProvider ?? {}, '__testId') ?? 'none'));
  const tenantId = $derived(String(adminContext.tenant?.tenantId ?? 'none'));
  const resourceNames = $derived(getResources().map(resource => resource.name).join(','));
  const authId = $derived(String(Reflect.get(getAuthProvider({ optional: true }) ?? {}, '__testId') ?? 'none'));
  const taskId = $derived(String(Reflect.get(getTaskProvider({ optional: true }) ?? {}, '__testId') ?? 'none'));
  const routerId = $derived(getRouterProvider()?.parse().params.instance ?? 'none');
  const route = $derived(routerState?.route ?? '/');
  const routeInstance = $derived(routerState?.params.instance ?? 'none');

  function changeLocale() {
    translation.setLocale(nextLocale);
  }

  async function changeLocaleLater() {
    await Promise.resolve();
    translation.setLocale(nextLocale);
  }

  async function navigateWithinScope() {
    await adminContext.navigate(`/?scope=${instance}`);
  }
</script>

<button data-testid={`change-locale-${instance}`} onclick={changeLocale}>change locale</button>
<button data-testid={`change-locale-later-${instance}`} onclick={changeLocaleLater}>change locale later</button>
<button data-testid={`navigate-${instance}`} onclick={navigateWithinScope}>navigate</button>

<output
  data-testid="context-probe-{instance}"
  data-provider={providerUrl}
  data-provider-names={providerNames}
  data-resource-provider={resourceProviderUrl}
  data-live={liveId}
  data-access={accessId}
  data-audit={auditId}
  data-notification={notificationId}
  data-chat={chatId}
  data-agent={agentId}
  data-tenant={tenantId}
  data-resources={resourceNames}
  data-auth={authId}
  data-task={taskId}
  data-router={routerId}
  data-route={route}
  data-route-instance={routeInstance}
  data-route-scope={routerState?.params.scope ?? 'none'}
  data-locale={translation.locale}
  data-translation={translation.t('common.save')}
>{instance}</output>
