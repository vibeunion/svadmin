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
    // Decorative demo tones — use the chart palette, not status tokens.
    { name: 'Top Contributor', Icon: Medal, tone: 'svadmin-u-133e86d6e1b8 svadmin-u-b1c4d746518d' },
    { name: 'Early Adopter', Icon: Star, tone: 'svadmin-u-97f0119b2cac svadmin-u-0f618ab9ca2f' },
    { name: 'Community Mentor', Icon: Award, tone: 'svadmin-u-2917dba92464 svadmin-u-c4501453167b' },
    { name: 'Launch Partner', Icon: Crown, tone: 'svadmin-u-22fda335435d svadmin-u-ed43795e908d' },
  ];
  const recentUploads: { name: string; size: string; Icon: Component; tone: string }[] = [
    { name: 'dashboard-spec.fig', size: '4.2 MB', Icon: Image, tone: 'svadmin-u-287a02ddc463 svadmin-u-cddd27bcad85' },
    { name: 'release-notes.md', size: '18 KB', Icon: FileText, tone: 'svadmin-u-97f0119b2cac svadmin-u-0f618ab9ca2f' },
    { name: 'assets-bundle.zip', size: '24 MB', Icon: FileArchive, tone: 'svadmin-u-2917dba92464 svadmin-u-c4501453167b' },
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
  <Card.Card class="svadmin-u-05faf5c801ff">
    <Card.CardHeader class="svadmin-u-7fcf9124b5df">
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc">
        <Card.CardTitle class="svadmin-u-4ee734926ff6">{i18n.t('profileSections.projects')}</Card.CardTitle>
        <Button variant="ghost" size="sm">{i18n.t('profileSections.viewAll')}</Button>
      </div>
    </Card.CardHeader>
    <Card.CardContent class="svadmin-u-8a539c7fe216">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>{i18n.t('profileSections.projectName')}</Table.Head>
            <Table.Head class="svadmin-u-84789e8a20cd">{i18n.t('profileSections.progress')}</Table.Head>
            <Table.Head>{i18n.t('profileSections.people')}</Table.Head>
            <Table.Head class="svadmin-u-308fc069e46e">{i18n.t('profileSections.dueDate')}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each projectRows as row (row.name)}
            <Table.Row>
              <Table.Cell class="svadmin-u-2689f3958069">{row.name}</Table.Cell>
              <Table.Cell>
                <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
                  <Progress value={row.progress} class="svadmin-u-095acb275581 svadmin-u-36e579c0b41c" />
                  <span class="svadmin-u-ae2181c7b10f svadmin-u-308fc069e46e svadmin-u-359090c2d529 svadmin-u-bfa603190748">{row.progress}%</span>
                </div>
              </Table.Cell>
              <Table.Cell>
                <div class="svadmin-u-60fbb7713999 svadmin-u-27c43bea29d4">
                  {#each row.people as person (person)}
                    <div class="svadmin-u-60fbb7713999 svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-2ef11f1cb219 svadmin-u-e09880869d1f svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-16b1efa5875e svadmin-u-21752b56424c">{person}</div>
                  {/each}
                </div>
              </Table.Cell>
              <Table.Cell class="svadmin-u-308fc069e46e svadmin-u-bfa603190748">{row.due}</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.CardContent>
  </Card.Card>
{/snippet}

{#snippet badgesCard()}
  <Card.Card class="svadmin-u-05faf5c801ff">
    <Card.CardHeader class="svadmin-u-7fcf9124b5df">
      <Card.CardTitle class="svadmin-u-4ee734926ff6">{i18n.t('profileSections.communityBadges')}</Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent>
      <div class="svadmin-u-f3c543ad5fe9 svadmin-u-8e75e3db482b svadmin-u-77a2a20e90d4">
        {#each badges as badge (badge.name)}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-9fe52d5d506c">
            <div class="svadmin-u-60fbb7713999 svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-5f22e64f2282 {badge.tone}">
              <badge.Icon class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
            </div>
            <span class="svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{badge.name}</span>
          </div>
        {/each}
      </div>
    </Card.CardContent>
  </Card.Card>
{/snippet}

{#if variant === 'default'}
  <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd svadmin-u-19d9b25e8fae">
    <div class="svadmin-u-3e7ce58d64fa">
      <Card.Card class="svadmin-u-05faf5c801ff">
        <Card.CardHeader class="svadmin-u-7fcf9124b5df">
          <Card.CardTitle class="svadmin-u-4ee734926ff6">{i18n.t('profileSections.about')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="svadmin-u-14dd497ee9c5 svadmin-u-fc7473ca09eb">
          <p class="svadmin-u-bfa603190748">Full-stack developer focused on design systems and developer tooling. Building in the open.</p>
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748"><Briefcase class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />Nebula Labs</div>
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748"><MapPin class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />Shanghai, CN</div>
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748"><Globe class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />alexchen.dev</div>
        </Card.CardContent>
      </Card.Card>

      <Card.Card class="svadmin-u-05faf5c801ff">
        <Card.CardHeader class="svadmin-u-7fcf9124b5df">
          <Card.CardTitle class="svadmin-u-4ee734926ff6">{i18n.t('profileSections.workExperience')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="svadmin-u-6ed543e2fbbb">
          {#each workExperience as job (job.company)}
            <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4">
              <div>
                <p class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{job.role}</p>
                <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{job.company}</p>
              </div>
              <span class="svadmin-u-012fbd121f37 svadmin-u-359090c2d529 svadmin-u-bfa603190748">{job.period}{#if job.current}{i18n.t('profileSections.present')}{/if}</span>
            </div>
          {/each}
        </Card.CardContent>
      </Card.Card>

      <Card.Card class="svadmin-u-05faf5c801ff">
        <Card.CardHeader class="svadmin-u-7fcf9124b5df">
          <Card.CardTitle class="svadmin-u-4ee734926ff6">{i18n.t('profileSections.skills')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent>
          <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-58284b4ea568">
            {#each skills as skill (skill)}
              <Badge variant="secondary" class="svadmin-u-359090c2d529">{skill}</Badge>
            {/each}
          </div>
        </Card.CardContent>
      </Card.Card>

      {@render badgesCard()}
    </div>

    <div class="svadmin-u-3e7ce58d64fa svadmin-u-422d10025c0d">
      {@render projectsTable()}

      <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd svadmin-u-e00ad81645a2">
        <Card.Card class="svadmin-u-05faf5c801ff">
          <Card.CardHeader class="svadmin-u-7fcf9124b5df">
            <Card.CardTitle class="svadmin-u-4ee734926ff6">{i18n.t('profileSections.recentUploads')}</Card.CardTitle>
          </Card.CardHeader>
          <Card.CardContent class="svadmin-u-14dd497ee9c5">
            {#each recentUploads as file (file.name)}
              <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c">
                <div class="svadmin-u-60fbb7713999 svadmin-u-e7a768f922d2 svadmin-u-ae2181c7b10f svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-5f22e64f2282 {file.tone}">
                  <file.Icon class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
                </div>
                <div class="svadmin-u-7e0b7cdf1a94 svadmin-u-36e579c0b41c">
                  <p class="svadmin-u-f283ea9bea0e svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{file.name}</p>
                  <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{file.size}</p>
                </div>
              </div>
            {/each}
          </Card.CardContent>
        </Card.Card>

        <Card.Card class="svadmin-u-05faf5c801ff">
          <Card.CardHeader class="svadmin-u-7fcf9124b5df">
            <Card.CardTitle class="svadmin-u-4ee734926ff6">{i18n.t('profileSections.contributors')}</Card.CardTitle>
          </Card.CardHeader>
          <Card.CardContent>
            <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-58284b4ea568">
              {#each contributors as person (person)}
                <div class="svadmin-u-60fbb7713999 svadmin-u-e7a768f922d2 svadmin-u-ae2181c7b10f svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-2ef11f1cb219 svadmin-u-1dc571a3609f svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-16b1efa5875e svadmin-u-21752b56424c" title={person}>
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
  <div class="svadmin-u-3e7ce58d64fa">
    <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd svadmin-u-ab1b20c2292a">
      {#each highlights as item (item.label)}
        <Card.Card class="svadmin-u-05faf5c801ff">
          <Card.CardContent class="svadmin-u-8e63407b5ceb">
            <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{item.label}</p>
            <div class="svadmin-u-b6b02c0ebef6 svadmin-u-60fbb7713999 svadmin-u-b7012bb243cc svadmin-u-77a2a20e90d4">
              <span class="svadmin-u-d5c9b0001e7e svadmin-u-69450ef1487e svadmin-u-d4108abe6359">{item.value}</span>
              <span class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-a3899220f90e svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-76747e5e02ff"><TrendingUp class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />{item.delta}</span>
            </div>
          </Card.CardContent>
        </Card.Card>
      {/each}
    </div>

    <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd svadmin-u-19d9b25e8fae">
      <div class="svadmin-u-422d10025c0d">
        {@render projectsTable()}
      </div>

      <div class="svadmin-u-3e7ce58d64fa">
        <Card.Card class="svadmin-u-05faf5c801ff">
          <Card.CardHeader class="svadmin-u-7fcf9124b5df">
            <Card.CardTitle class="svadmin-u-4ee734926ff6">{i18n.t('profileSections.openJobs')}</Card.CardTitle>
          </Card.CardHeader>
          <Card.CardContent class="svadmin-u-6ed543e2fbbb">
            {#each openJobs as job (job.title)}
              <div>
                <p class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{job.title}</p>
                <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{job.location} · {job.type}</p>
              </div>
            {/each}
          </Card.CardContent>
        </Card.Card>

        <Card.Card class="svadmin-u-05faf5c801ff">
          <Card.CardHeader class="svadmin-u-7fcf9124b5df">
            <Card.CardTitle class="svadmin-u-4ee734926ff6">{i18n.t('profileSections.locations')}</Card.CardTitle>
          </Card.CardHeader>
          <Card.CardContent class="svadmin-u-6f7e013d6499">
            {#each locations as loc (loc)}
              <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">
                <Building2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />{loc}
              </div>
            {/each}
          </Card.CardContent>
        </Card.Card>
      </div>
    </div>

    <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd svadmin-u-e00ad81645a2">
      <Card.Card class="svadmin-u-05faf5c801ff">
        <Card.CardHeader class="svadmin-u-7fcf9124b5df">
          <Card.CardTitle class="svadmin-u-4ee734926ff6">{i18n.t('profileSections.members')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent>
          <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-58284b4ea568">
            {#each companyMembers as person (person)}
              <div class="svadmin-u-60fbb7713999 svadmin-u-e7a768f922d2 svadmin-u-ae2181c7b10f svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-2ef11f1cb219 svadmin-u-1dc571a3609f svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-16b1efa5875e svadmin-u-21752b56424c" title={person}>
                {person.startsWith('+') ? person : initials(person)}
              </div>
            {/each}
          </div>
        </Card.CardContent>
      </Card.Card>

      <Card.Card class="svadmin-u-05faf5c801ff">
        <Card.CardHeader class="svadmin-u-7fcf9124b5df">
          <Card.CardTitle class="svadmin-u-4ee734926ff6">{i18n.t('profileSections.investments')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="svadmin-u-14dd497ee9c5">
          {#each investments as inv (inv.round)}
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-fc7473ca09eb">
              <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{inv.round}</span>
              <span class="svadmin-u-bfa603190748">{inv.amount} · {inv.date}</span>
            </div>
          {/each}
        </Card.CardContent>
      </Card.Card>
    </div>
  </div>
{:else}
  <div class="svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd svadmin-u-19d9b25e8fae">
    <div class="svadmin-u-3e7ce58d64fa">
      <Card.Card class="svadmin-u-05faf5c801ff">
        <Card.CardHeader class="svadmin-u-7fcf9124b5df">
          <Card.CardTitle class="svadmin-u-4ee734926ff6">{i18n.t('profileSections.about')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="svadmin-u-14dd497ee9c5 svadmin-u-fc7473ca09eb">
          <p class="svadmin-u-bfa603190748">Pro gamer & content creator. Competing in FPS tournaments and streaming daily.</p>
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748"><Gamepad2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />ShadowFox#7742</div>
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748"><MapPin class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />Seoul, KR</div>
        </Card.CardContent>
      </Card.Card>

      <Card.Card class="svadmin-u-05faf5c801ff">
        <Card.CardHeader class="svadmin-u-7fcf9124b5df">
          <Card.CardTitle class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-4ee734926ff6">
            <Gamepad2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />{i18n.t('profileSections.favoriteGames')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="svadmin-u-6ed543e2fbbb">
          {#each favoriteGames as game (game.name)}
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4">
              <div>
                <p class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{game.name}</p>
                <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{game.hours}</p>
              </div>
              <Badge variant="secondary" class="svadmin-u-1dc571a3609f">{game.rank}</Badge>
            </div>
          {/each}
        </Card.CardContent>
      </Card.Card>

      <Card.Card class="svadmin-u-05f954a846d6 svadmin-u-989c466fdbe7">
        <Card.CardHeader class="svadmin-u-7fcf9124b5df">
          <Card.CardTitle class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-4ee734926ff6">
            <Play class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-20aaf08a7ed1" />{i18n.t('profileSections.nowPlaying')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent>
          <p class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">Starfall Odyssey — Ranked</p>
          <p class="svadmin-u-b6b02c0ebef6 svadmin-u-359090c2d529 svadmin-u-bfa603190748">Streaming live for 2.4K viewers</p>
          <div class="svadmin-u-eccd13ef4f2f svadmin-u-095acb275581 svadmin-u-2cd02d11d1af svadmin-u-ac204c108886 svadmin-u-30f13f694038">
            <div class="svadmin-u-668b21aa5409 svadmin-u-f09b0bbad9dd svadmin-u-ac204c108886 svadmin-u-75b1bec3ea0e"></div>
          </div>
        </Card.CardContent>
      </Card.Card>

      {@render badgesCard()}

      <Card.Card class="svadmin-u-05faf5c801ff">
        <Card.CardHeader class="svadmin-u-7fcf9124b5df">
          <Card.CardTitle class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-4ee734926ff6">
            <Users class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />{i18n.t('profileSections.team')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="svadmin-u-14dd497ee9c5">
          {#each [{ name: 'VortexQueen', role: 'IGL' }, { name: 'NoScopeNina', role: 'AWPer' }, { name: 'PixelPunk', role: 'Support' }] as mate (mate.name)}
            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-7e9a2a250cc3">
              <div class="svadmin-u-60fbb7713999 svadmin-u-ed8a5df7b2fb svadmin-u-2bbcfc3b5179 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-2ef11f1cb219 svadmin-u-1dc571a3609f svadmin-u-e83a7042bc91 svadmin-u-bfa603190748">
                {initials(mate.name)}
              </div>
              <div class="svadmin-u-7e0b7cdf1a94">
                <p class="svadmin-u-f283ea9bea0e svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{mate.name}</p>
                <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{mate.role}</p>
              </div>
            </div>
          {/each}
        </Card.CardContent>
      </Card.Card>
    </div>

    <div class="svadmin-u-3e7ce58d64fa svadmin-u-422d10025c0d">
      <Card.Card class="svadmin-u-05faf5c801ff">
        <Card.CardHeader class="svadmin-u-7fcf9124b5df">
          <Card.CardTitle class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-4ee734926ff6">
            <Trophy class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />{i18n.t('profileSections.tournaments')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="svadmin-u-8a539c7fe216">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>{i18n.t('profileSections.tournaments')}</Table.Head>
                <Table.Head>{i18n.t('profileSections.progress')}</Table.Head>
                <Table.Head class="svadmin-u-308fc069e46e">{i18n.t('account.amount')}</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each tournaments as t (t.name)}
                <Table.Row>
                  <Table.Cell class="svadmin-u-2689f3958069">{t.name}</Table.Cell>
                  <Table.Cell><Badge variant="secondary" class="svadmin-u-1dc571a3609f">{t.result}</Badge></Table.Cell>
                  <Table.Cell class="svadmin-u-308fc069e46e svadmin-u-bfa603190748">{t.prize}</Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.CardContent>
      </Card.Card>

      <Card.Card class="svadmin-u-05faf5c801ff">
        <Card.CardHeader class="svadmin-u-7fcf9124b5df">
          <Card.CardTitle class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-4ee734926ff6">
            <Users class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-bfa603190748" />{i18n.t('profileSections.network')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent>
          <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-58284b4ea568">
            {#each gamerNetwork as person (person)}
              <div class="svadmin-u-60fbb7713999 svadmin-u-e7a768f922d2 svadmin-u-ae2181c7b10f svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-ac204c108886 svadmin-u-2ef11f1cb219 svadmin-u-1dc571a3609f svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-16b1efa5875e svadmin-u-21752b56424c" title={person}>
                {person.startsWith('+') ? person : initials(person)}
              </div>
            {/each}
          </div>
        </Card.CardContent>
      </Card.Card>

      <div>
        <h4 class="svadmin-u-1bb883263ed2 svadmin-u-4ee734926ff6 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('profileSections.recentActivity')}</h4>
        <ActivityTimeline activities={gamerActivities} showAutoRefresh={false} />
      </div>
    </div>
  </div>
{/if}
