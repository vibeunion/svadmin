<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Switch } from '../ui/switch/index.js';
  import * as Card from '../ui/card/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  const i18n = useTranslation();
  const sections = [{ id: 'profile', title: i18n.t('account.basicSettings') }, { id: 'signin', title: i18n.t('account.socialSignIn') }, { id: 'preferences', title: i18n.t('account.preferences') }, { id: 'api', title: i18n.t('account.manageApi') }];
  let active = $state('profile');
  let visible = $state(true);
  let available = $state(true);
</script>

<ContentPageShell pageId="account-settings-sidebar" width="wide">
  <ContentPageHeader title={i18n.t('account.settingsSidebar')} description={i18n.t('account.settingsSidebarDescription')} />
  <div class="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]"><nav class="flex gap-1 overflow-x-auto lg:flex-col">{#each sections as section (section.id)}<button type="button" class={'whitespace-nowrap rounded-md px-3 py-2 text-left text-sm ' + (active === section.id ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')} onclick={() => active = section.id}>{section.title}</button>{/each}</nav><div class="space-y-4">{#if active === 'profile'}<Card.Card><Card.CardContent class="space-y-4 p-5"><h2 class="text-sm font-semibold text-foreground">{i18n.t('account.basicSettings')}</h2><Input value="Alex Chen" aria-label={i18n.t('profile.name')} /><Input value="Nebula Labs" aria-label="Company" /><div class="flex items-center justify-between border-t border-border pt-4"><span class="text-sm text-foreground">{i18n.t('account.visibility')}</span><Switch bind:checked={visible} /></div><div class="flex items-center justify-between"><span class="text-sm text-foreground">{i18n.t('account.availability')}</span><Switch bind:checked={available} /></div></Card.CardContent></Card.Card>{:else if active === 'signin'}<Card.Card><Card.CardContent class="space-y-4 p-5"><h2 class="text-sm font-semibold text-foreground">{i18n.t('account.socialSignIn')}</h2><p class="text-sm text-muted-foreground">Connect the providers your team trusts for sign in.</p><Button variant="outline">GitHub</Button><Button variant="outline">Google</Button></Card.CardContent></Card.Card>{:else if active === 'preferences'}<Card.Card><Card.CardContent class="space-y-4 p-5"><h2 class="text-sm font-semibold text-foreground">{i18n.t('account.preferences')}</h2><Input value="English" aria-label={i18n.t('account.language')} /><Input value="Asia/Shanghai" aria-label={i18n.t('account.timezone')} /><Input value="CNY" aria-label={i18n.t('account.currency')} /></Card.CardContent></Card.Card>{:else}<Card.Card><Card.CardContent class="space-y-4 p-5"><h2 class="text-sm font-semibold text-foreground">{i18n.t('account.manageApi')}</h2><Input readonly value="sv_demo_pub_9f3e********41ab" aria-label="API key" /><Button variant="outline">{i18n.t('common.copy')}</Button></Card.CardContent></Card.Card>{/if}</div></div>
</ContentPageShell>
