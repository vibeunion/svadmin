<script lang="ts">
  import { provideAdminContext, type DataProvider } from '@svadmin/core';
  import MemberDirectory, { type DirectoryMember, type MemberDirectoryProvider } from '../../../packages/ui/src/components/account/MemberDirectory.svelte';

  let reads = 0;
  let invites = 0;
  let invitedEmail = $state<string | null>(null);
  let lastAttempt = $state<string | null>(null);
  let inviteCount = $state(0);
  const params = new URLSearchParams(window.location.search);
  const failLoad = params.has('fail-load');
  const failInvite = params.has('fail-invite');
  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  const members: DirectoryMember[] = [
    { id: 'member-1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'Administrator' },
    { id: 'member-2', name: 'Grace Hopper', email: 'grace@example.com', role: 'Analyst' },
  ];
  const provider: MemberDirectoryProvider = {
    list: async () => {
      reads += 1;
      if (failLoad && reads === 1) throw new Error('PRIVATE_MEMBER_READ_FIXTURE');
      return members;
    },
    invite: async email => {
      invites += 1;
      inviteCount = invites;
      lastAttempt = email;
      if (failInvite && invites === 1) throw new Error('PRIVATE_MEMBER_INVITE_FIXTURE');
      invitedEmail = email;
    },
  };
  provideAdminContext({ dataProvider });
</script>

<section data-testid="member-fixture">
  <div data-testid="member-page"><MemberDirectory provider={provider} /></div>
  <aside aria-label="Fixture results">
    <pre data-testid="member-invited">{invitedEmail ?? 'null'}</pre>
    <pre data-testid="member-last-attempt">{lastAttempt ?? 'null'}</pre>
    <p data-testid="member-invites">{inviteCount}</p>
  </aside>
</section>
