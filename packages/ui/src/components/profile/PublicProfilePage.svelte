<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '../ui/card/index.js';
  import { Button } from '../ui/button/index.js';
  import { Badge } from '../ui/badge/index.js';
  import * as Tabs from '../ui/tabs/index.js';
  import ProjectsGrid from './ProjectsGrid.svelte';
  import ActivityTimeline from './ActivityTimeline.svelte';
  import TeamsShowcase from './TeamsShowcase.svelte';
  import ProfileVariantSections from './ProfileVariantSections.svelte';
  import { MapPin, Link, Calendar, MoreHorizontal } from '@lucide/svelte';

  const i18n = useTranslation();

  type ProfileVariant = 'default' | 'company' | 'gamer';
  type ProfileTab = 'projects' | 'activity' | 'teams';

  interface Props {
    variant?: ProfileVariant;
    initialTab?: ProfileTab;
    columns?: 2 | 3;
    showSections?: boolean;
  }

  let { variant = 'default', initialTab = 'projects', columns = 2, showSections = false }: Props = $props();
  let activeTab = $derived<ProfileTab>(initialTab);

  // Demo profile data based on variant
  const profileData = $derived.by(() => {
    if (variant === 'company') {
      return {
        name: 'Acme Corporation',
        tagline: 'Building the future of enterprise software',
        industry: 'Technology',
        employees: 1250,
        founded: '2015',
        website: 'acme.com',
        location: 'San Francisco, CA',
        followers: 8420,
        following: 312,
        stats: [
          { label: i18n.t('profile.employees'), value: '1,250' },
          { label: i18n.t('publicProfile.projects'), value: '48' },
          { label: i18n.t('publicProfile.teams'), value: '12' },
        ],
        tags: ['SaaS', 'Enterprise', 'Cloud', 'AI'],
      };
    } else if (variant === 'gamer') {
      return {
        name: 'ShadowFox',
        tagline: 'Pro gamer & content creator',
        gamerTag: 'ShadowFox#7742',
        level: 42,
        rank: 'Diamond II',
        location: 'Seoul, KR',
        followers: 24600,
        following: 180,
        stats: [
          { label: i18n.t('profile.gamesPlayed'), value: '1,284' },
          { label: i18n.t('profile.winRate'), value: '68%' },
          { label: i18n.t('profile.rank'), value: 'Diamond II' },
        ],
        tags: ['FPS', 'RPG', 'Streaming', 'Esports'],
      };
    }
    return {
      name: 'Alex Chen',
      tagline: 'Full-stack developer & open source enthusiast',
      location: 'Shanghai, CN',
      website: 'alexchen.dev',
      joinedDate: '2023',
      followers: 1234,
      following: 567,
      stats: [
        { label: i18n.t('publicProfile.projects'), value: '24' },
        { label: i18n.t('publicProfile.followers'), value: '1.2K' },
        { label: i18n.t('publicProfile.following'), value: '567' },
      ],
      tags: ['TypeScript', 'Svelte', 'Node.js', 'Open Source'],
    };
  });

  // Demo data
  const demoProjects = [
    { id: '1', name: 'Dashboard Redesign', description: 'Modern admin dashboard with real-time analytics and customizable widgets.', members: 8, tasks: 34, status: 'active' as const, tags: ['UI', 'Analytics'] },
    { id: '2', name: 'API Gateway v2', description: 'High-performance API gateway with rate limiting and circuit breaker patterns.', members: 5, tasks: 21, status: 'active' as const, tags: ['Backend', 'Infra'] },
    { id: '3', name: 'Mobile App', description: 'Cross-platform mobile application built with React Native.', members: 12, tasks: 56, status: 'completed' as const, tags: ['Mobile', 'React'] },
    { id: '4', name: 'Data Pipeline', description: 'Real-time data processing pipeline for event streaming.', members: 3, tasks: 18, status: 'on-hold' as const, tags: ['Data', 'Streaming'] },
    { id: '5', name: 'Design System 2.0', description: 'Unified component library with tokens, theming, and accessibility built in.', members: 6, tasks: 42, status: 'active' as const, tags: ['Design', 'UI'] },
    { id: '6', name: 'Billing Platform', description: 'Subscription billing with usage-based metering and invoicing.', members: 4, tasks: 27, status: 'active' as const, tags: ['Fintech', 'Backend'] },
    { id: '7', name: 'Search Relevance', description: 'Ranking improvements and vector search for the product catalog.', members: 5, tasks: 19, status: 'on-hold' as const, tags: ['Search', 'ML'] },
    { id: '8', name: 'Customer Portal', description: 'Self-service portal for account management and support tickets.', members: 9, tasks: 63, status: 'active' as const, tags: ['Web', 'Support'] },
    { id: '9', name: 'Notification Hub', description: 'Multi-channel notification delivery with user preference controls.', members: 3, tasks: 15, status: 'completed' as const, tags: ['Infra', 'Messaging'] },
    { id: '10', name: 'Analytics SDK', description: 'Lightweight event tracking SDK for web and mobile clients.', members: 4, tasks: 22, status: 'active' as const, tags: ['Analytics', 'SDK'] },
    { id: '11', name: 'Docs Revamp', description: 'New documentation site with interactive examples and search.', members: 2, tasks: 31, status: 'completed' as const, tags: ['Docs', 'Content'] },
    { id: '12', name: 'Edge Cache Layer', description: 'Distributed caching layer to cut origin latency for global users.', members: 5, tasks: 17, status: 'on-hold' as const, tags: ['Infra', 'Performance'] },
  ];

  const demoActivities = [
    { id: '1', type: 'posted' as const, user: 'Alex Chen', content: 'Just shipped the new dashboard redesign with real-time analytics support.', timestamp: '2 hours ago' },
    { id: '2', type: 'commented' as const, user: 'Alex Chen', target: 'API Gateway PR #42', content: 'Looks great, just a few minor suggestions on error handling.', timestamp: '5 hours ago' },
    { id: '3', type: 'created' as const, user: 'Alex Chen', target: 'Mobile App project', timestamp: '1 day ago' },
    { id: '4', type: 'joined' as const, user: 'Alex Chen', target: 'Design Systems Guild', timestamp: '3 days ago' },
    { id: '5', type: 'starred' as const, user: 'Alex Chen', target: 'svadmin/svadmin', timestamp: '1 week ago' },
  ];

  const demoTeams = [
    { id: '1', name: 'Frontend Platform', description: 'Building the core UI component library and design system.', members: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }], totalMembers: 8, rating: 4.8, color: '#3b82f6' },
    { id: '2', name: 'Backend Services', description: 'API development, microservices architecture, and infrastructure.', members: [{ name: 'Dave' }, { name: 'Eve' }], totalMembers: 5, rating: 4.5, color: '#10b981' },
    { id: '3', name: 'Design', description: 'User experience research and visual design.', members: [{ name: 'Frank' }, { name: 'Grace' }, { name: 'Hank' }, { name: 'Ivy' }], totalMembers: 6, rating: 4.9, color: '#f59e0b' },
    { id: '4', name: 'DevOps', description: 'CI/CD pipelines, cloud infrastructure, and reliability engineering.', members: [{ name: 'Jack' }, { name: 'Karen' }], totalMembers: 4, rating: 4.3, color: '#8b5cf6' },
    { id: '5', name: 'Data Engineering', description: 'Data pipelines, warehousing, and analytics infrastructure.', members: [{ name: 'Leo' }, { name: 'Mona' }, { name: 'Nina' }], totalMembers: 7, rating: 4.6, color: '#ec4899' },
    { id: '6', name: 'Mobile', description: 'iOS and Android apps with shared native modules.', members: [{ name: 'Oscar' }, { name: 'Paula' }], totalMembers: 5, rating: 4.4, color: '#14b8a6' },
    { id: '7', name: 'QA & Release', description: 'Test automation, release management, and quality gates.', members: [{ name: 'Quinn' }, { name: 'Rosa' }, { name: 'Sam' }], totalMembers: 4, rating: 4.2, color: '#f97316' },
    { id: '8', name: 'Security', description: 'Application security, compliance, and incident response.', members: [{ name: 'Tina' }, { name: 'Umar' }], totalMembers: 3, rating: 4.7, color: '#ef4444' },
    { id: '9', name: 'Developer Relations', description: 'Documentation, community programs, and developer outreach.', members: [{ name: 'Vera' }, { name: 'Will' }, { name: 'Xu' }], totalMembers: 6, rating: 4.5, color: '#0ea5e9' },
  ];
</script>

<div class="space-y-6" data-svadmin-content-page="public-profile">
  <!-- Cover + Profile Header -->
  <Card.Card class="overflow-hidden border-border/60">
    <div class="h-28 bg-gradient-to-r from-primary/25 via-primary/15 to-accent/20 relative sm:h-40">
      <div class="absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle, currentColor 1px, transparent 1px); background-size: 24px 24px;"></div>
    </div>
    <Card.CardContent class="relative px-6 pb-5">
      <div class="-mt-10 flex flex-col gap-3 sm:-mt-12 sm:flex-row sm:items-end sm:gap-4">
        <div class="ring-4 ring-card rounded-2xl overflow-hidden shrink-0">
          <div class="flex h-20 w-20 items-center justify-center bg-primary/10 text-2xl font-bold text-primary sm:h-24 sm:w-24 sm:text-3xl">
            {profileData.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-bold text-foreground sm:text-2xl">{profileData.name}</h2>
          {#if profileData.tagline}
            <p class="text-muted-foreground">{profileData.tagline}</p>
          {/if}
          <div class="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {#if profileData.location}
              <span class="flex items-center gap-1"><MapPin class="h-3.5 w-3.5" />{profileData.location}</span>
            {/if}
            {#if profileData.website}
              <span class="flex items-center gap-1"><Link class="h-3.5 w-3.5" />{profileData.website}</span>
            {/if}
            {#if 'joinedDate' in profileData && profileData.joinedDate}
              <span class="flex items-center gap-1"><Calendar class="h-3.5 w-3.5" />{i18n.t('publicProfile.joinedDate', { date: profileData.joinedDate })}</span>
            {/if}
          </div>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <Button size="sm">{i18n.t('publicProfile.editProfile')}</Button>
          <Button size="sm" variant="outline">{i18n.t('publicProfile.sendMessage')}</Button>
          <Button size="sm" variant="ghost"><MoreHorizontal class="h-4 w-4" /></Button>
        </div>
      </div>

      <!-- Stats -->
      {#if profileData.stats.length > 0}
        <div class="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
          {#each profileData.stats as stat (stat.label)}
            <div class="text-center">
              <div class="text-xl font-bold text-foreground">{stat.value}</div>
              <div class="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Tags -->
      {#if profileData.tags.length > 0}
        <div class="mt-3 flex flex-wrap gap-1.5">
          {#each profileData.tags as tag (tag)}
            <Badge variant="outline" class="text-xs">{tag}</Badge>
          {/each}
        </div>
      {/if}
    </Card.CardContent>
  </Card.Card>

  <!-- Variant-specific sections (About / Projects table / Jobs / Games ...) -->
  {#if showSections}
    <ProfileVariantSections {variant} />
  {:else}
    <!-- Tabs: Projects / Activity / Teams -->
    <Tabs.Root value={activeTab}>
      <Tabs.List class="w-full justify-start border-b">
        <Tabs.Trigger value="projects" active={activeTab === 'projects'} onclick={() => activeTab = 'projects'} class="gap-1.5">{i18n.t('publicProfile.projects')}</Tabs.Trigger>
        <Tabs.Trigger value="activity" active={activeTab === 'activity'} onclick={() => activeTab = 'activity'} class="gap-1.5">{i18n.t('publicProfile.activity')}</Tabs.Trigger>
        <Tabs.Trigger value="teams" active={activeTab === 'teams'} onclick={() => activeTab = 'teams'} class="gap-1.5">{i18n.t('publicProfile.teams')}</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="projects" active={activeTab === 'projects'} class="mt-4">
        <ProjectsGrid {columns} projects={columns === 3 ? demoProjects : demoProjects.slice(0, 6)} />
      </Tabs.Content>
      <Tabs.Content value="activity" active={activeTab === 'activity'} class="mt-4">
        <ActivityTimeline activities={demoActivities} />
      </Tabs.Content>
      <Tabs.Content value="teams" active={activeTab === 'teams'} class="mt-4">
        <TeamsShowcase teams={demoTeams} />
      </Tabs.Content>
    </Tabs.Root>
  {/if}
</div>
