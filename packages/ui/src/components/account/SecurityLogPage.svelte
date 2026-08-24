<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Download } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import FilterToolbar from '../content/FilterToolbar.svelte';
  import SecurityEventTable from '../content/SecurityEventTable.svelte';
  import type { SecurityEvent } from '../content/SecurityEventTable.svelte';
  import { referenceDemoData } from '../../reference-data.js';
  const i18n = useTranslation();
  let query = $state('');
  const events: SecurityEvent[] = referenceDemoData.securityEvents;
  const filtered = $derived(query ? events.filter((event) => `${event.event} ${event.actor} ${event.location}`.toLowerCase().includes(query.toLowerCase())) : events);
</script>

<ContentPageShell pageId="account-security-log" width="wide">
  <ContentPageHeader title={i18n.t('account.securityLog')} description={i18n.t('account.securityLogDescription')} actions={undefined} />
  <div class="flex justify-end"><Button variant="outline" size="sm"><Download class="size-3.5" />{i18n.t('common.export')}</Button></div>
  <FilterToolbar bind:query placeholder={i18n.t('common.search')} />
  <SecurityEventTable events={filtered} />
</ContentPageShell>
