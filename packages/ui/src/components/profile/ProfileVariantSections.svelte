<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '../ui/card/index.js';
  import * as Table from '../ui/table/index.js';
  import { Badge } from '../ui/badge/index.js';
  import { Button } from '../ui/button/index.js';
  import { Progress } from '../ui/progress/index.js';
  import ActivityTimeline from './ActivityTimeline.svelte';
  import {
    Briefcase, MapPin, Users, TrendingUp, Gamepad2, Trophy, Play,
    FileText, Image, FileArchive, Star, Award, Medal, Crown, Building2, Globe,
  } from '@lucide/svelte';
  import type { Component } from 'svelte';

  const i18n = useTranslation();

  type ProfileVariant = 'default' | 'company' | 'gamer';

  interface Props {
    variant?: ProfileVariant;
  }

  let { variant = 'default' }: Props = $props();

  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  // Default variant demo data
  const workExperience = [
    { role: 'Senior Frontend Engineer', company: 'Nebula Labs', period: '2023 - ', current: true },
    { role: 'Frontend Engineer', company: 'Craftworks Studio', period: '2020 - 2023', current: false },
    { role: 'UI Developer', company: 'PixelForge', period: '2018 - 2020', current: false },
  ];
  const skills = ['TypeScript', 'Svelte', 'Node.js', 'GraphQL', 'Design Systems', 'Accessibility'];
  const badges: { name: string; Icon: Component; tone: string }[] = [
    { name: 'Top Contributor', Icon: Medal, tone: 'bg-amber-500/10 text-amber-600' },
    { name: 'Early Adopter', Icon: Star, tone: 'bg-blue-500/10 text-blue-600' },
    { name: 'Community Mentor', Icon: Award, tone: 'bg-violet-500/10 text-violet-600' },
    { name: 'Launch Partner', Icon: Crown, tone: 'bg-emerald-500/10 text-emerald-600' },
  ];
  const recentUploads: { name: string; size: string; Icon: Component; tone: string }[] = [
    { name: 'dashboard-spec.fig', size: '4.2 MB', Icon: Image, tone: 'bg-pink-500/10 text-pink-600' },
    { name: 'release-notes.md', size: '18 KB', Icon: FileText, tone: 'bg-blue-500/10 text-blue-600' },
    { name: 'assets-bundle.zip', size: '24 MB', Icon: FileArchive, tone: 'bg-amber-500/10 text-amber-600' },
  ];
  const contributors = ['Mia Torres', 'Chen Wei', 'Ava Novak', 'Liam Ortiz', 'Sofia Petrova', '+8'];

  // Company variant demo data
  const highlights = [
    { label: 'Total revenue', value: '$4.8M', delta: '+18.2%' },
    { label: 'Active customers', value: '2,340', delta: '+9.4%' },
    { label: 'Open positions', value: '17', delta: '+3' },
  ];
  const openJobs = [
    { title: 'Senior Product Designer', location: 'Remote', type: 'Full-time' },
    { title: 'Staff Engineer, Platform', location: 'San Francisco', type: 'Full-time' },
    { title: 'Developer Advocate', location: 'Berlin', type: 'Contract' },
  ];
  const locations = ['San Francisco, US', 'Berlin, DE', 'Singapore, SG'];
  const companyMembers = ['Elena Marsh', 'David Kim', 'Priya Nair', 'Oscar Lund', 'Hana Sato', '+27'];
  const investments = [
    { round: 'Series B', amount: '$24M', date: '2025-11' },
    { round: 'Series A', amount: '$9M', date: '2023-06' },
    { round: 'Seed', amount: '$1.8M', date: '2021-03' },
  ];

  // Gamer variant demo data
  const favoriteGames = [
    { name: 'Starfall Odyssey', hours: '412h', rank: 'Diamond II' },
    { name: 'Neon Drift', hours: '268h', rank: 'Master' },
    { name: 'Iron Bastion', hours: '190h', rank: 'Platinum I' },
  ];
  const tournaments = [
    { name: 'Winter Clash 2026', result: 'Top 8', prize: '$1,200' },
    { name: 'City Invitational', result: '1st', prize: '$3,500' },
    { name: 'Open Qualifier #14', result: '2nd', prize: '$800' },
  ];
  const gamerNetwork = ['VortexQueen', 'NoScopeNina', 'PixelPunk', 'GrimReaperX', '+42'];
  const gamerActivities = [
    { id: 'g1', type: 'posted' as const, user: 'ShadowFox', content: 'Just hit Diamond II in Starfall Odyssey ranked. Clutch final round!', timestamp: '1 hour ago' },
    { id: 'g2', type: 'created' as const, user: 'ShadowFox', target: 'Winter Clash 2026 highlights', timestamp: '6 hours ago' },
    { id: 'g3', type: 'joined' as const, user: 'ShadowFox', target: 'City Invitational', timestamp: '2 days ago' },
    { id: 'g4', type: 'commented' as const, user: 'ShadowFox', target: "VortexQueen's stream", content: 'That flank was insane, gg!', timestamp: '3 days ago' },
  ];

  // Shared projects table demo data
  const projectRows = [
    { name: 'Dashboard Redesign', progress: 72, people: ['AC', 'SK', 'MJ'], due: '2026-09-15' },
    { name: 'API Gateway v2', progress: 45, people: ['LW', 'TB'], due: '2026-10-02' },
    { name: 'Mobile App', progress: 100, people: ['ED', 'AC', 'MK', 'RS'], due: '2026-06-30' },
    { name: 'Data Pipeline', progress: 20, people: ['NK'], due: '2026-12-01' },
  ];
</script>

{#snippet projectsTable()}
  <Card.Card class="border-border/60">
    <Card.CardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <Card.CardTitle class="text-base">{i18n.t('profileSections.projects')}</Card.CardTitle>
        <Button variant="ghost" size="sm">{i18n.t('profileSections.viewAll')}</Button>
      </div>
    </Card.CardHeader>
    <Card.CardContent class="p-0">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>{i18n.t('profileSections.projectName')}</Table.Head>
            <Table.Head class="w-40">{i18n.t('profileSections.progress')}</Table.Head>
            <Table.Head>{i18n.t('profileSections.people')}</Table.Head>
            <Table.Head class="text-right">{i18n.t('profileSections.dueDate')}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each projectRows as row (row.name)}
            <Table.Row>
              <Table.Cell class="font-medium">{row.name}</Table.Cell>
              <Table.Cell>
                <div class="flex items-center gap-2">
                  <Progress value={row.progress} class="h-1.5 flex-1" />
                  <span class="w-9 text-right text-xs text-muted-foreground">{row.progress}%</span>
                </div>
              </Table.Cell>
              <Table.Cell>
                <div class="flex -space-x-1.5">
                  {#each row.people as person (person)}
                    <div class="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground ring-2 ring-card">{person}</div>
                  {/each}
                </div>
              </Table.Cell>
              <Table.Cell class="text-right text-muted-foreground">{row.due}</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.CardContent>
  </Card.Card>
{/snippet}

{#snippet badgesCard()}
  <Card.Card class="border-border/60">
    <Card.CardHeader class="pb-3">
      <Card.CardTitle class="text-base">{i18n.t('profileSections.communityBadges')}</Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent>
      <div class="grid grid-cols-2 gap-2">
        {#each badges as badge (badge.name)}
          <div class="flex items-center gap-2 rounded-lg border border-border/60 p-2.5">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg {badge.tone}">
              <badge.Icon class="h-4 w-4" />
            </div>
            <span class="text-xs font-medium text-foreground">{badge.name}</span>
          </div>
        {/each}
      </div>
    </Card.CardContent>
  </Card.Card>
{/snippet}

{#if variant === 'default'}
  <div class="grid gap-4 lg:grid-cols-3">
    <div class="space-y-4">
      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="text-base">{i18n.t('profileSections.about')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="space-y-2.5 text-sm">
          <p class="text-muted-foreground">Full-stack developer focused on design systems and developer tooling. Building in the open.</p>
          <div class="flex items-center gap-2 text-muted-foreground"><Briefcase class="h-3.5 w-3.5" />Nebula Labs</div>
          <div class="flex items-center gap-2 text-muted-foreground"><MapPin class="h-3.5 w-3.5" />Shanghai, CN</div>
          <div class="flex items-center gap-2 text-muted-foreground"><Globe class="h-3.5 w-3.5" />alexchen.dev</div>
        </Card.CardContent>
      </Card.Card>

      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="text-base">{i18n.t('profileSections.workExperience')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="space-y-3">
          {#each workExperience as job (job.company)}
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm font-medium text-foreground">{job.role}</p>
                <p class="text-xs text-muted-foreground">{job.company}</p>
              </div>
              <span class="shrink-0 text-xs text-muted-foreground">{job.period}{#if job.current}{i18n.t('profileSections.present')}{/if}</span>
            </div>
          {/each}
        </Card.CardContent>
      </Card.Card>

      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="text-base">{i18n.t('profileSections.skills')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent>
          <div class="flex flex-wrap gap-1.5">
            {#each skills as skill (skill)}
              <Badge variant="secondary" class="text-xs">{skill}</Badge>
            {/each}
          </div>
        </Card.CardContent>
      </Card.Card>

      {@render badgesCard()}
    </div>

    <div class="space-y-4 lg:col-span-2">
      {@render projectsTable()}

      <div class="grid gap-4 sm:grid-cols-2">
        <Card.Card class="border-border/60">
          <Card.CardHeader class="pb-3">
            <Card.CardTitle class="text-base">{i18n.t('profileSections.recentUploads')}</Card.CardTitle>
          </Card.CardHeader>
          <Card.CardContent class="space-y-2.5">
            {#each recentUploads as file (file.name)}
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg {file.tone}">
                  <file.Icon class="h-4 w-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-foreground">{file.name}</p>
                  <p class="text-xs text-muted-foreground">{file.size}</p>
                </div>
              </div>
            {/each}
          </Card.CardContent>
        </Card.Card>

        <Card.Card class="border-border/60">
          <Card.CardHeader class="pb-3">
            <Card.CardTitle class="text-base">{i18n.t('profileSections.contributors')}</Card.CardTitle>
          </Card.CardHeader>
          <Card.CardContent>
            <div class="flex flex-wrap gap-1.5">
              {#each contributors as person (person)}
                <div class="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card" title={person}>
                  {person.startsWith('+') ? person : initials(person)}
                </div>
              {/each}
            </div>
          </Card.CardContent>
        </Card.Card>
      </div>
    </div>
  </div>
{:else if variant === 'company'}
  <div class="space-y-4">
    <div class="grid gap-4 sm:grid-cols-3">
      {#each highlights as item (item.label)}
        <Card.Card class="border-border/60">
          <Card.CardContent class="p-4">
            <p class="text-xs text-muted-foreground">{item.label}</p>
            <div class="mt-1 flex items-baseline gap-2">
              <span class="text-xl font-bold text-foreground">{item.value}</span>
              <span class="flex items-center gap-0.5 text-xs font-medium text-green-600"><TrendingUp class="h-3 w-3" />{item.delta}</span>
            </div>
          </Card.CardContent>
        </Card.Card>
      {/each}
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="lg:col-span-2">
        {@render projectsTable()}
      </div>

      <div class="space-y-4">
        <Card.Card class="border-border/60">
          <Card.CardHeader class="pb-3">
            <Card.CardTitle class="text-base">{i18n.t('profileSections.openJobs')}</Card.CardTitle>
          </Card.CardHeader>
          <Card.CardContent class="space-y-3">
            {#each openJobs as job (job.title)}
              <div>
                <p class="text-sm font-medium text-foreground">{job.title}</p>
                <p class="text-xs text-muted-foreground">{job.location} · {job.type}</p>
              </div>
            {/each}
          </Card.CardContent>
        </Card.Card>

        <Card.Card class="border-border/60">
          <Card.CardHeader class="pb-3">
            <Card.CardTitle class="text-base">{i18n.t('profileSections.locations')}</Card.CardTitle>
          </Card.CardHeader>
          <Card.CardContent class="space-y-2">
            {#each locations as loc (loc)}
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 class="h-3.5 w-3.5" />{loc}
              </div>
            {/each}
          </Card.CardContent>
        </Card.Card>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="text-base">{i18n.t('profileSections.members')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent>
          <div class="flex flex-wrap gap-1.5">
            {#each companyMembers as person (person)}
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card" title={person}>
                {person.startsWith('+') ? person : initials(person)}
              </div>
            {/each}
          </div>
        </Card.CardContent>
      </Card.Card>

      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="text-base">{i18n.t('profileSections.investments')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="space-y-2.5">
          {#each investments as inv (inv.round)}
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-foreground">{inv.round}</span>
              <span class="text-muted-foreground">{inv.amount} · {inv.date}</span>
            </div>
          {/each}
        </Card.CardContent>
      </Card.Card>
    </div>
  </div>
{:else}
  <div class="grid gap-4 lg:grid-cols-3">
    <div class="space-y-4">
      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="text-base">{i18n.t('profileSections.about')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="space-y-2.5 text-sm">
          <p class="text-muted-foreground">Pro gamer & content creator. Competing in FPS tournaments and streaming daily.</p>
          <div class="flex items-center gap-2 text-muted-foreground"><Gamepad2 class="h-3.5 w-3.5" />ShadowFox#7742</div>
          <div class="flex items-center gap-2 text-muted-foreground"><MapPin class="h-3.5 w-3.5" />Seoul, KR</div>
        </Card.CardContent>
      </Card.Card>

      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="flex items-center gap-2 text-base">
            <Gamepad2 class="h-4 w-4 text-muted-foreground" />{i18n.t('profileSections.favoriteGames')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="space-y-3">
          {#each favoriteGames as game (game.name)}
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-sm font-medium text-foreground">{game.name}</p>
                <p class="text-xs text-muted-foreground">{game.hours}</p>
              </div>
              <Badge variant="secondary" class="text-[10px]">{game.rank}</Badge>
            </div>
          {/each}
        </Card.CardContent>
      </Card.Card>

      <Card.Card class="border-primary/30 bg-primary/5">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="flex items-center gap-2 text-base">
            <Play class="h-4 w-4 text-primary" />{i18n.t('profileSections.nowPlaying')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent>
          <p class="text-sm font-medium text-foreground">Starfall Odyssey — Ranked</p>
          <p class="mt-1 text-xs text-muted-foreground">Streaming live for 2.4K viewers</p>
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/15">
            <div class="h-full w-2/3 rounded-full bg-primary"></div>
          </div>
        </Card.CardContent>
      </Card.Card>

      {@render badgesCard()}

      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="flex items-center gap-2 text-base">
            <Users class="h-4 w-4 text-muted-foreground" />{i18n.t('profileSections.team')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="space-y-2.5">
          {#each [{ name: 'VortexQueen', role: 'IGL' }, { name: 'NoScopeNina', role: 'AWPer' }, { name: 'PixelPunk', role: 'Support' }] as mate (mate.name)}
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                {initials(mate.name)}
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{mate.name}</p>
                <p class="text-xs text-muted-foreground">{mate.role}</p>
              </div>
            </div>
          {/each}
        </Card.CardContent>
      </Card.Card>
    </div>

    <div class="space-y-4 lg:col-span-2">
      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="flex items-center gap-2 text-base">
            <Trophy class="h-4 w-4 text-muted-foreground" />{i18n.t('profileSections.tournaments')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="p-0">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>{i18n.t('profileSections.tournaments')}</Table.Head>
                <Table.Head>{i18n.t('profileSections.progress')}</Table.Head>
                <Table.Head class="text-right">{i18n.t('account.amount')}</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each tournaments as t (t.name)}
                <Table.Row>
                  <Table.Cell class="font-medium">{t.name}</Table.Cell>
                  <Table.Cell><Badge variant="secondary" class="text-[10px]">{t.result}</Badge></Table.Cell>
                  <Table.Cell class="text-right text-muted-foreground">{t.prize}</Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.CardContent>
      </Card.Card>

      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="flex items-center gap-2 text-base">
            <Users class="h-4 w-4 text-muted-foreground" />{i18n.t('profileSections.network')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent>
          <div class="flex flex-wrap gap-1.5">
            {#each gamerNetwork as person (person)}
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card" title={person}>
                {person.startsWith('+') ? person : initials(person)}
              </div>
            {/each}
          </div>
        </Card.CardContent>
      </Card.Card>

      <div>
        <h4 class="mb-3 text-base font-semibold text-foreground">{i18n.t('profileSections.recentActivity')}</h4>
        <ActivityTimeline activities={gamerActivities} showAutoRefresh={false} />
      </div>
    </div>
  </div>
{/if}
