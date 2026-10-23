<script lang="ts">
  import { provideAdminContext, createEnterpriseRequestContext, type ApprovalProvider, type ApprovalRecord, type ApprovalTransition, type DataProvider, type EnterpriseProviderRequestContext } from '@svadmin/core';
  import ApprovalCenter from '../../../packages/ui/src/components/ApprovalCenter.svelte';

  let reads = 0;
  let transitions = 0;
  let lastTransition = $state<ApprovalTransition | null>(null);
  let lastTransitionContext = $state<EnterpriseProviderRequestContext | null>(null);
  let readCount = $state(0);
  let transitionCount = $state(0);
  const params = new URLSearchParams(window.location.search);
  const failLoad = params.has('fail-load');
  const failAction = params.has('fail-action');
  const conflictAction = params.has('conflict-action');
  const requestContext = createEnterpriseRequestContext({ tenantId: 'tenant-a' });
  const record: ApprovalRecord = {
    id: 'request-1',
    version: 2,
    title: 'Expense request',
    applicant: 'Alice',
    status: 'pending',
    allowedActions: [{ id: 'approve', label: 'Approve', commentRequired: false, targetRequired: false }],
    attachments: [{ id: 'attachment-1', name: 'Invoice.pdf' }],
    history: [{ id: 'event-1', action: 'submit', actor: 'Alice', at: '2026-09-20T01:00:00Z', comment: '' }],
  };
  let currentRecord: ApprovalRecord = record;
  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  const provider: ApprovalProvider = {
    list: async () => {
      reads += 1;
      readCount = reads;
      if (failLoad && reads === 1) throw new Error('PRIVATE_APPROVAL_READ_FIXTURE');
      return { data: [currentRecord], total: 1 };
    },
    get: async () => currentRecord,
    transition: async (scope, input) => {
      transitions += 1;
      transitionCount = transitions;
      lastTransition = input;
      lastTransitionContext = scope;
      if (conflictAction) {
        currentRecord = { ...record, version: record.version + 1, status: 'approved', allowedActions: [] };
        return { ok: false, code: 'VERSION_CONFLICT', current: currentRecord };
      }
      if (failAction && transitions === 1) throw new Error('PRIVATE_APPROVAL_ACTION_FIXTURE');
      return { ok: true, record: { ...record, version: 3, status: 'approved', allowedActions: [] } };
    },
  };
  provideAdminContext({ dataProvider });
</script>

<section data-testid="approval-fixture">
  <ApprovalCenter {provider} {requestContext} />
  <aside aria-label="Fixture results">
    <p data-testid="approval-reads">{readCount}</p>
    <p data-testid="approval-transitions">{transitionCount}</p>
    <pre data-testid="approval-transition">{JSON.stringify(lastTransition)}</pre>
    <pre data-testid="approval-transition-context">{JSON.stringify(lastTransitionContext)}</pre>
  </aside>
</section>

<style>
  aside {
    max-width: 100%;
    overflow-wrap: anywhere;
  }

  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
