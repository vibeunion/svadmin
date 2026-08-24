<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Tabs from '../ui/tabs/index.js';
  import ProfileCard from './ProfileCard.svelte';
  import ProjectsGrid from './ProjectsGrid.svelte';
  import ActivityTimeline from './ActivityTimeline.svelte';
  import TeamsShowcase from './TeamsShowcase.svelte';
  import ProfileVariantSections from './ProfileVariantSections.svelte';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import { referenceDemoData } from '../../reference-data.js';

  type ProfileVariant = 'default' | 'company' | 'gamer';
  type ProfileTab = 'projects' | 'activity' | 'teams';
  interface Props { variant?: ProfileVariant; initialTab?: ProfileTab; columns?: 2 | 3; showSections?: boolean; }
  let { variant = 'default', initialTab = 'projects', columns = 2, showSections = false }: Props = $props();
  let activeTab = $derived<ProfileTab>(initialTab);
  const i18n = useTranslation();

  const profileData = $derived.by(() => variant === 'company'
    ? { name: 'Acme Corporation', tagline: 'Building the future of enterprise software', industry: 'Technology', employees: 1250, founded: '2015', website: 'acme.com', location: 'San Francisco, CA', followers: 8420, following: 312, tags: ['SaaS', 'Enterprise', 'Cloud'], stats: [{ label: i18n.t('profile.employees'), value: '1,250' }, { label: i18n.t('publicProfile.projects'), value: '48' }, { label: i18n.t('publicProfile.teams'), value: '12' }] }
    : variant === 'gamer'
      ? { name: 'ShadowFox', tagline: 'Pro gamer & content creator', gamerTag: 'ShadowFox#7742', level: 42, rank: 'Diamond II', location: 'Seoul, KR', followers: 24600, following: 180, tags: ['FPS', 'RPG', 'Streaming'], stats: [{ label: i18n.t('profile.gamesPlayed'), value: '1,284' }, { label: i18n.t('profile.winRate'), value: '68%' }, { label: i18n.t('profile.rank'), value: 'Diamond II' }] }
      : { name: 'Alex Chen', tagline: 'Full-stack developer & open source enthusiast', location: 'Shanghai, CN', website: 'alexchen.dev', joinedDate: '2023', followers: 1234, following: 567, tags: ['TypeScript', 'Svelte', 'Open Source'], stats: [{ label: i18n.t('publicProfile.projects'), value: '24' }, { label: i18n.t('publicProfile.followers'), value: '1.2K' }, { label: i18n.t('publicProfile.following'), value: '567' }] });

  const projects = referenceDemoData.projects;
  const activities = $derived.by(() => [
    { id: '1', type: 'posted' as const, user: profileData.name, content: 'Shipped the new dashboard redesign with real-time analytics support.', timestamp: '2 hours ago' },
    { id: '2', type: 'commented' as const, user: profileData.name, target: 'API Gateway PR #42', content: 'Looks great, with a few minor suggestions on error handling.', timestamp: '5 hours ago' },
    { id: '3', type: 'created' as const, user: profileData.name, target: 'Mobile App project', timestamp: '1 day ago' },
  ]);
  const teams = referenceDemoData.teams;
</script>

<ContentPageShell pageId="public-profile" width="wide">
  <ContentPageHeader title={profileData.name} eyebrow={i18n.t('publicProfile.title')} description={profileData.tagline} />
  <ProfileCard {...profileData} {variant} />
  {#if showSections}
    <ProfileVariantSections {variant} />
  {:else}
    <Tabs.Root value={activeTab} onValueChange={(value) => activeTab = value as ProfileTab}>
      <Tabs.List class="w-full justify-start overflow-x-auto">
        <Tabs.Trigger value="projects">{i18n.t('publicProfile.projects')}</Tabs.Trigger>
        <Tabs.Trigger value="activity">{i18n.t('publicProfile.activity')}</Tabs.Trigger>
        <Tabs.Trigger value="teams">{i18n.t('publicProfile.teams')}</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="projects" class="mt-5"><ProjectsGrid {projects} {columns} /></Tabs.Content>
      <Tabs.Content value="activity" class="mt-5"><ActivityTimeline activities={activities} /></Tabs.Content>
      <Tabs.Content value="teams" class="mt-5"><TeamsShowcase {teams} /></Tabs.Content>
    </Tabs.Root>
  {/if}
</ContentPageShell>
