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
    <div class="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]"><ProfileCard {...profileData} {variant} /><ProfileVariantSections {variant} /></div>
  {:else if initialTab === 'projects'}
    <div class="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3"><div class="flex items-center gap-2"><Badge variant="outline">{columns} {columnLabel}</Badge><span class="text-sm text-muted-foreground">{visibleProjects.length} {i18n.t('publicProfile.projects')}</span></div><div class="flex gap-3 text-sm"><a class="text-primary" href="#/public-profile/projects/2-columns">2 {columnLabel}</a><a class="text-primary" href="#/public-profile/projects/3-columns">3 {columnLabel}</a></div></div>
    <div class={columns === 2 ? 'grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]' : 'space-y-5'}>{#if columns === 2}<ProfileCard {...profileData} {variant} />{/if}<ProjectsGrid projects={visibleProjects} {columns} /></div>
  {:else if initialTab === 'activity'}
    <div class="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]"><ProfileCard {...profileData} {variant} /><div class="space-y-4"><div class="flex items-center justify-between border-b border-border pb-3"><h2 class="text-base font-semibold text-foreground">{i18n.t('publicProfile.activity')}</h2><Badge variant="outline">{activities.length}</Badge></div><ActivityTimeline activities={activities} /></div></div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-3">{#each profileData.stats as stat (stat.label)}<div class="border-l-2 border-primary pl-3"><p class="text-sm text-muted-foreground">{stat.label}</p><p class="mt-1 text-xl font-semibold text-foreground">{stat.value}</p></div>{/each}</div>
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]"><TeamsShowcase {teams} /><ProfileCard {...profileData} {variant} /></div>
  {/if}
</ContentPageShell>
