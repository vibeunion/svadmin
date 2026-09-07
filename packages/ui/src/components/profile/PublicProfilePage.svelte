<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Badge } from '../ui/badge/index.js';
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
  const i18n = useTranslation();
  const columnLabel = $derived(i18n.locale === 'zh-CN' ? '栏' : 'columns');
  const pageId = $derived(showSections ? `public-profile-${variant}` : `public-profile-${initialTab}-${initialTab === 'projects' ? columns : 'view'}`);

  const profileData = $derived.by(() => variant === 'company'
    ? { name: 'Acme Corporation', tagline: 'Building the future of enterprise software', industry: 'Technology', employees: 1250, founded: '2015', website: 'acme.com', location: 'San Francisco, CA', followers: 8420, following: 312, tags: ['SaaS', 'Enterprise', 'Cloud'], stats: [{ label: i18n.t('profile.employees'), value: '1,250' }, { label: i18n.t('publicProfile.projects'), value: '48' }, { label: i18n.t('publicProfile.teams'), value: '12' }] }
    : variant === 'gamer'
      ? { name: 'ShadowFox', tagline: 'Pro gamer & content creator', gamerTag: 'ShadowFox#7742', level: 42, rank: 'Diamond II', location: 'Seoul, KR', followers: 24600, following: 180, tags: ['FPS', 'RPG', 'Streaming'], stats: [{ label: i18n.t('profile.gamesPlayed'), value: '1,284' }, { label: i18n.t('profile.winRate'), value: '68%' }, { label: i18n.t('profile.rank'), value: 'Diamond II' }] }
      : { name: 'Alex Chen', tagline: 'Full-stack developer & open source enthusiast', location: 'Shanghai, CN', website: 'alexchen.dev', joinedDate: '2023', followers: 1234, following: 567, tags: ['TypeScript', 'Svelte', 'Open Source'], stats: [{ label: i18n.t('publicProfile.projects'), value: '24' }, { label: i18n.t('publicProfile.followers'), value: '1.2K' }, { label: i18n.t('publicProfile.following'), value: '567' }] });

  const projects = referenceDemoData.projects;
  const visibleProjects = $derived(columns === 2 ? projects.slice(0, 6) : projects);
  const activities = $derived.by(() => [
    { id: '1', type: 'posted' as const, user: profileData.name, content: 'Shipped the new dashboard redesign with real-time analytics support.', timestamp: '2 hours ago' },
    { id: '2', type: 'commented' as const, user: profileData.name, target: 'API Gateway PR #42', content: 'Looks great, with a few minor suggestions on error handling.', timestamp: '5 hours ago' },
    { id: '3', type: 'created' as const, user: profileData.name, target: 'Mobile App project', timestamp: '1 day ago' },
  ]);
  const teams = referenceDemoData.teams;
</script>

<ContentPageShell {pageId} width="wide">
  <ContentPageHeader title={profileData.name} eyebrow={i18n.t('publicProfile.title')} description={profileData.tagline} />
  {#if showSections}
    <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0d304f904cb0 svadmin-u-bf1b5b54929e"><ProfileCard {...profileData} {variant} /><ProfileVariantSections {variant} /></div>
  {:else if initialTab === 'projects'}
    <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c svadmin-u-8b8196092091 svadmin-u-18049387f0af svadmin-u-1b2d54a3fd12"><div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4"><Badge variant="outline">{columns} {columnLabel}</Badge><span class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{visibleProjects.length} {i18n.t('publicProfile.projects')}</span></div><div class="svadmin-u-60fbb7713999 svadmin-u-1004c0c3954c svadmin-u-fc7473ca09eb"><a class="svadmin-u-20aaf08a7ed1" href="#/public-profile/projects/2-columns">2 {columnLabel}</a><a class="svadmin-u-20aaf08a7ed1" href="#/public-profile/projects/3-columns">3 {columnLabel}</a></div></div>
    <div class={columns === 2 ? 'svadmin-u-f3c543ad5fe9 svadmin-u-0d304f904cb0 svadmin-u-bf1b5b54929e' : 'svadmin-u-b43b4c086d9a'}>{#if columns === 2}<ProfileCard {...profileData} {variant} />{/if}<ProjectsGrid projects={visibleProjects} {columns} /></div>
  {:else if initialTab === 'activity'}
    <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0d304f904cb0 svadmin-u-bf1b5b54929e"><ProfileCard {...profileData} {variant} /><div class="svadmin-u-3e7ce58d64fa"><div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-65fdbade2025 svadmin-u-18049387f0af svadmin-u-7fcf9124b5df"><h2 class="svadmin-u-4ee734926ff6 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('publicProfile.activity')}</h2><Badge variant="outline">{activities.length}</Badge></div><ActivityTimeline activities={activities} /></div></div>
  {:else}
    <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd svadmin-u-ab1b20c2292a">{#each profileData.stats as stat (stat.label)}<div class="svadmin-u-f57e7530965b svadmin-u-6cbc84dd9e1a svadmin-u-81976f3f2c63"><p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{stat.label}</p><p class="svadmin-u-b6b02c0ebef6 svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{stat.value}</p></div>{/each}</div>
    <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0d304f904cb0 svadmin-u-956fcc198f22"><TeamsShowcase {teams} /><ProfileCard {...profileData} {variant} /></div>
  {/if}
</ContentPageShell>
