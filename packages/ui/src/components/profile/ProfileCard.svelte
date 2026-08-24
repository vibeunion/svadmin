<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { Badge } from '../ui/badge/index.js';
  import * as Card from '../ui/card/index.js';
  import { Avatar } from '../ui/avatar/index.js';
  import { MapPin, Link, Calendar, Users, Star, Trophy, Building2, Gamepad2 } from '@lucide/svelte';

  const i18n = useTranslation();

  interface ProfileStats {
    label: string;
    value: string | number;
  }

  interface Props {
    variant?: 'default' | 'company' | 'gamer';
    name: string;
    tagline?: string;
    avatar?: string;
    coverImage?: string;
    location?: string;
    website?: string;
    joinedDate?: string;
    stats?: ProfileStats[];
    tags?: string[];
    followers?: number;
    following?: number;
    // Company-specific
    industry?: string;
    employees?: number;
    founded?: string;
    // Gamer-specific
    gamerTag?: string;
    level?: number;
    rank?: string;
  }

  let {
    variant = 'default',
    name,
    tagline = '',
    avatar,
    coverImage,
    location,
    website,
    joinedDate,
    stats = [],
    tags = [],
    followers = 0,
    following = 0,
    industry,
    employees,
    founded,
    gamerTag,
    level,
    rank,
  }: Props = $props();

  const initials = $derived(name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?');
  const statsGridClass = $derived(stats.length > 3 ? 'grid-cols-4' : stats.length === 3 ? 'grid-cols-3' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-1');

  let isConnected = $state(false);

  function toggleConnect() {
    isConnected = !isConnected;
  }
</script>

<Card.Card class="overflow-hidden border-border/60">
  {#if coverImage}
    <div class="h-32 bg-muted relative">
      <img src={coverImage} alt="" class="h-full w-full object-cover" />
    </div>
  {:else}
    <div class="h-32 bg-muted relative">
      <div class="absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle, currentColor 1px, transparent 1px); background-size: 20px 20px;"></div>
    </div>
  {/if}

  <Card.CardContent class="relative px-5 pb-5">
    <div class="-mt-10 mb-3 flex items-end gap-4">
      <div class="ring-4 ring-card rounded-lg overflow-hidden shrink-0">
        {#if avatar}
          <Avatar class="h-20 w-20">
            <img src={avatar} alt={name} />
          </Avatar>
        {:else}
          <div class="flex h-20 w-20 items-center justify-center rounded-lg bg-primary/10 text-primary text-2xl font-bold">
            {initials}
          </div>
        {/if}
      </div>
      <div class="flex-1 min-w-0 pb-1">
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-semibold text-foreground truncate">{name}</h3>
          {#if variant === 'company'}
            <Badge variant="secondary" class="shrink-0"><Building2 class="h-3 w-3 mr-1" />{i18n.t('profile.company')}</Badge>
          {:else if variant === 'gamer'}
            <Badge variant="secondary" class="shrink-0"><Gamepad2 class="h-3 w-3 mr-1" />{i18n.t('profile.gamer')}</Badge>
          {/if}
        </div>
        {#if tagline}
          <p class="text-sm text-muted-foreground truncate">{tagline}</p>
        {/if}
      </div>
    </div>

    <!-- Variant-specific info -->
    {#if variant === 'company' && (industry || employees || founded)}
      <div class="mb-3 grid grid-cols-2 gap-2 text-sm">
        {#if industry}
          <div class="flex items-center gap-2 text-muted-foreground">
            <Building2 class="h-3.5 w-3.5" />
            <span>{industry}</span>
          </div>
        {/if}
        {#if employees}
          <div class="flex items-center gap-2 text-muted-foreground">
            <Users class="h-3.5 w-3.5" />
            <span>{employees} {i18n.t('profile.employees')}</span>
          </div>
        {/if}
        {#if founded}
          <div class="flex items-center gap-2 text-muted-foreground">
            <Calendar class="h-3.5 w-3.5" />
            <span>{i18n.t('profile.founded')} {founded}</span>
          </div>
        {/if}
        {#if website}
          <div class="flex items-center gap-2 text-muted-foreground">
            <Link class="h-3.5 w-3.5" />
            <span class="truncate">{website}</span>
          </div>
        {/if}
      </div>
    {:else if variant === 'gamer' && (gamerTag || level || rank)}
      <div class="mb-3 grid grid-cols-2 gap-2 text-sm">
        {#if gamerTag}
          <div class="flex items-center gap-2 text-muted-foreground">
            <Gamepad2 class="h-3.5 w-3.5" />
            <span>{gamerTag}</span>
          </div>
        {/if}
        {#if level}
          <div class="flex items-center gap-2 text-muted-foreground">
            <Star class="h-3.5 w-3.5" />
            <span>{i18n.t('profile.level')} {level}</span>
          </div>
        {/if}
        {#if rank}
          <div class="flex items-center gap-2 text-muted-foreground">
            <Trophy class="h-3.5 w-3.5" />
            <span>{rank}</span>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Default profile info -->
      <div class="mb-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
        {#if location}
          <div class="flex items-center gap-1.5"><MapPin class="h-3.5 w-3.5" /><span>{location}</span></div>
        {/if}
        {#if website}
          <div class="flex items-center gap-1.5"><Link class="h-3.5 w-3.5" /><span class="truncate">{website}</span></div>
        {/if}
        {#if joinedDate}
          <div class="flex items-center gap-1.5"><Calendar class="h-3.5 w-3.5" /><span>{i18n.t('publicProfile.joinedDate', { date: joinedDate })}</span></div>
        {/if}
      </div>
    {/if}

    <!-- Tags -->
    {#if tags.length > 0}
      <div class="mb-3 flex flex-wrap gap-1.5">
        {#each tags as tag (tag)}
          <Badge variant="outline" class="text-xs">{tag}</Badge>
        {/each}
      </div>
    {/if}

    <!-- Stats -->
    {#if stats.length > 0}
      <div class="mb-3 grid {statsGridClass} gap-3 border-t pt-3">
        {#each stats as stat (stat.label)}
          <div class="text-center">
            <div class="text-lg font-semibold text-foreground">{stat.value}</div>
            <div class="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Followers / Following -->
    {#if followers > 0 || following > 0}
      <div class="flex gap-4 text-sm border-t pt-3">
        {#if followers > 0}
          <span><strong class="text-foreground">{followers}</strong> <span class="text-muted-foreground">{i18n.t('publicProfile.followers')}</span></span>
        {/if}
        {#if following > 0}
          <span><strong class="text-foreground">{following}</strong> <span class="text-muted-foreground">{i18n.t('publicProfile.following')}</span></span>
        {/if}
      </div>
    {/if}

    <!-- Actions -->
    <div class="mt-3 flex gap-2">
      <Button
        size="sm"
        variant={isConnected ? 'outline' : 'default'}
        onclick={toggleConnect}
      >
        {isConnected ? i18n.t('network.connected') : i18n.t('network.connect')}
      </Button>
      <Button size="sm" variant="outline">{i18n.t('publicProfile.sendMessage')}</Button>
    </div>
  </Card.CardContent>
</Card.Card>
