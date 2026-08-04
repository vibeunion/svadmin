<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '../ui/card/index.js';
  import { Badge } from '../ui/badge/index.js';
  import { Button } from '../ui/button/index.js';
  import { Switch } from '../ui/switch/index.js';
  import {
    Briefcase, Calendar, FileText, Image, FileArchive, Link2, Loader2,
    Star, Award, Medal, Crown,
  } from '@lucide/svelte';
  import type { Component } from 'svelte';

  const i18n = useTranslation();

  let availableToHire = $state(true);
  let saving = $state(false);

  async function handleSave() {
    saving = true;
    await new Promise((r) => setTimeout(r, 800));
    saving = false;
  }

  const infoRows = [
    { label: 'profile.name', value: 'Alex Chen' },
    { label: 'account.phone', value: '+86 138 **** 9527' },
    { label: 'account.dateOfBirth', value: '1995-04-18' },
    { label: 'account.address', value: 'Shanghai, CN' },
  ];

  const badges: { name: string; Icon: Component; tone: string }[] = [
    { name: 'Top Contributor', Icon: Medal, tone: 'bg-amber-500/10 text-amber-600' },
    { name: 'Early Adopter', Icon: Star, tone: 'bg-blue-500/10 text-blue-600' },
    { name: 'Community Mentor', Icon: Award, tone: 'bg-violet-500/10 text-violet-600' },
    { name: 'Launch Partner', Icon: Crown, tone: 'bg-emerald-500/10 text-emerald-600' },
  ];

  interface Connection {
    id: string;
    name: string;
    detail: string;
    connected: boolean;
  }
  let connections = $state<Connection[]>([
    { id: 'repo', name: 'Source Control', detail: 'alexchen', connected: true },
    { id: 'chat', name: 'ChatOps', detail: '@alex.chen', connected: true },
    { id: 'drive', name: 'Cloud Drive', detail: 'alex@example.com', connected: false },
  ]);

  const files: { name: string; size: string; Icon: Component; tone: string }[] = [
    { name: 'portfolio-2026.pdf', size: '2.1 MB', Icon: FileText, tone: 'bg-red-500/10 text-red-600' },
    { name: 'avatar-pack.zip', size: '8.4 MB', Icon: FileArchive, tone: 'bg-amber-500/10 text-amber-600' },
    { name: 'cover-photo.png', size: '1.2 MB', Icon: Image, tone: 'bg-pink-500/10 text-pink-600' },
  ];

  const calendars = [
    { name: 'Work Calendar', detail: 'alex@nebulalabs.io', primary: true },
    { name: 'Personal Calendar', detail: 'alex@example.com', primary: false },
  ];

  function toggleConnection(id: string, connected: boolean) {
    connections = connections.map((c) => (c.id === id ? { ...c, connected } : c));
  }
</script>

<div class="space-y-6" data-svadmin-content-page="account">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-xl font-semibold text-foreground">{i18n.t('account.userProfile')}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{i18n.t('account.userProfileDescription')}</p>
    </div>
    <Button onclick={handleSave} disabled={saving} size="sm">
      {#if saving}<Loader2 class="h-4 w-4 animate-spin mr-2" />{/if}
      {i18n.t('common.save')}
    </Button>
  </div>

  <div class="grid gap-4 lg:grid-cols-3">
    <div class="space-y-4 lg:col-span-2">
      <!-- Personal Info -->
      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="text-base">{i18n.t('account.personalInfo')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="p-0">
          <div class="divide-y">
            {#each infoRows as row (row.label)}
              <div class="flex items-center justify-between px-6 py-3 text-sm">
                <span class="text-muted-foreground">{i18n.t(row.label)}</span>
                <span class="font-medium text-foreground">{row.value}</span>
              </div>
            {/each}
          </div>
        </Card.CardContent>
      </Card.Card>

      <!-- Work -->
      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="flex items-center gap-2 text-base">
            <Briefcase class="h-4 w-4 text-muted-foreground" />{i18n.t('account.work')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="space-y-4">
          <div class="flex items-center justify-between gap-4">
            <div class="space-y-1">
              <p class="text-sm font-medium text-foreground">{i18n.t('account.availableToHire')}</p>
              <p class="text-xs text-muted-foreground">{i18n.t('account.availableNow')}</p>
            </div>
            <Switch bind:checked={availableToHire} />
          </div>
          <div class="flex flex-wrap gap-1.5">
            {#each ['TypeScript', 'Svelte', 'Node.js', 'Design Systems'] as skill (skill)}
              <Badge variant="secondary" class="text-xs">{skill}</Badge>
            {/each}
          </div>
        </Card.CardContent>
      </Card.Card>

      <!-- Connections -->
      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="flex items-center gap-2 text-base">
            <Link2 class="h-4 w-4 text-muted-foreground" />{i18n.t('account.connections')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="p-0">
          <div class="divide-y">
            {#each connections as conn (conn.id)}
              <div class="flex items-center justify-between gap-4 px-6 py-3">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-foreground">{conn.name}</p>
                  <p class="truncate text-xs text-muted-foreground">{conn.detail}</p>
                </div>
                <Switch checked={conn.connected} onCheckedChange={(checked) => toggleConnection(conn.id, checked)} />
              </div>
            {/each}
          </div>
        </Card.CardContent>
      </Card.Card>
    </div>

    <div class="space-y-4">
      <!-- Badges -->
      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="text-base">{i18n.t('account.badges')}</Card.CardTitle>
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

      <!-- Calendar Accounts -->
      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="flex items-center gap-2 text-base">
            <Calendar class="h-4 w-4 text-muted-foreground" />{i18n.t('account.calendarAccounts')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="space-y-3">
          {#each calendars as cal (cal.name)}
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-foreground">{cal.name}</p>
                <p class="truncate text-xs text-muted-foreground">{cal.detail}</p>
              </div>
              {#if cal.primary}
                <Badge variant="secondary" class="shrink-0 text-[10px]">{i18n.t('account.active')}</Badge>
              {/if}
            </div>
          {/each}
        </Card.CardContent>
      </Card.Card>

      <!-- My Files -->
      <Card.Card class="border-border/60">
        <Card.CardHeader class="pb-3">
          <Card.CardTitle class="text-base">{i18n.t('account.myFiles')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="space-y-2.5">
          {#each files as file (file.name)}
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
    </div>
  </div>
</div>
