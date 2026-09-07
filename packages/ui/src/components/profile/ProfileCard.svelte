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

<Card.Card class="svadmin-u-2cd02d11d1af svadmin-u-05faf5c801ff">
  {#if coverImage}
    <div class="svadmin-u-b5f3ff77f4f9 svadmin-u-2ef11f1cb219 svadmin-u-d89972fe17d6">
      <img src={coverImage} alt="" class="svadmin-u-668b21aa5409 svadmin-u-6da6a3c3f741 svadmin-u-7d85d0c21a32" />
    </div>
  {:else}
    <div class="svadmin-u-b5f3ff77f4f9 svadmin-u-2ef11f1cb219 svadmin-u-d89972fe17d6">
      <div class="svadmin-u-da4dbfbc4fdc svadmin-u-7b7df0449b80 svadmin-u-7fc47b48933f" style="background-image: radial-gradient(circle, currentColor 1px, transparent 1px); background-size: 20px 20px;"></div>
    </div>
  {/if}

  <Card.CardContent class="svadmin-u-d89972fe17d6 svadmin-u-d139dd09e38d svadmin-u-09c1ba5f3e1a">
    <div class="svadmin-u-f69834fc7f5b svadmin-u-1bb883263ed2 svadmin-u-60fbb7713999 svadmin-u-6f27f4f79e55 svadmin-u-0c3bc98565dd">
      <div class="svadmin-u-44559afbdbd7 svadmin-u-21752b56424c svadmin-u-5f22e64f2282 svadmin-u-2cd02d11d1af svadmin-u-012fbd121f37">
        {#if avatar}
          <Avatar class="svadmin-u-0a769880db93 svadmin-u-ed831a4dff32">
            <img src={avatar} alt={name} />
          </Avatar>
        {:else}
          <div class="svadmin-u-60fbb7713999 svadmin-u-0a769880db93 svadmin-u-ed831a4dff32 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-5f22e64f2282 svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-3febee094e85 svadmin-u-69450ef1487e">
            {initials}
          </div>
        {/if}
      </div>
      <div class="svadmin-u-36e579c0b41c svadmin-u-7e0b7cdf1a94 svadmin-u-569eb16216dd">
        <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
          <h3 class="svadmin-u-42536e69e639 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-f283ea9bea0e">{name}</h3>
          {#if variant === 'company'}
            <Badge variant="secondary" class="svadmin-u-012fbd121f37"><Building2 class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-618162408e7a" />{i18n.t('profile.company')}</Badge>
          {:else if variant === 'gamer'}
            <Badge variant="secondary" class="svadmin-u-012fbd121f37"><Gamepad2 class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29 svadmin-u-618162408e7a" />{i18n.t('profile.gamer')}</Badge>
          {/if}
        </div>
        {#if tagline}
          <p class="svadmin-u-fc7473ca09eb svadmin-u-bfa603190748 svadmin-u-f283ea9bea0e">{tagline}</p>
        {/if}
      </div>
    </div>

    <!-- Variant-specific info -->
    {#if variant === 'company' && (industry || employees || founded)}
      <div class="svadmin-u-1bb883263ed2 svadmin-u-f3c543ad5fe9 svadmin-u-8e75e3db482b svadmin-u-77a2a20e90d4 svadmin-u-fc7473ca09eb">
        {#if industry}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748">
            <Building2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            <span>{industry}</span>
          </div>
        {/if}
        {#if employees}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748">
            <Users class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            <span>{employees} {i18n.t('profile.employees')}</span>
          </div>
        {/if}
        {#if founded}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748">
            <Calendar class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            <span>{i18n.t('profile.founded')} {founded}</span>
          </div>
        {/if}
        {#if website}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748">
            <Link class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            <span class="svadmin-u-f283ea9bea0e">{website}</span>
          </div>
        {/if}
      </div>
    {:else if variant === 'gamer' && (gamerTag || level || rank)}
      <div class="svadmin-u-1bb883263ed2 svadmin-u-f3c543ad5fe9 svadmin-u-8e75e3db482b svadmin-u-77a2a20e90d4 svadmin-u-fc7473ca09eb">
        {#if gamerTag}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748">
            <Gamepad2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            <span>{gamerTag}</span>
          </div>
        {/if}
        {#if level}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748">
            <Star class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            <span>{i18n.t('profile.level')} {level}</span>
          </div>
        {/if}
        {#if rank}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-bfa603190748">
            <Trophy class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
            <span>{rank}</span>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Default profile info -->
      <div class="svadmin-u-1bb883263ed2 svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-1004c0c3954c svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">
        {#if location}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568"><MapPin class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" /><span>{location}</span></div>
        {/if}
        {#if website}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568"><Link class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" /><span class="svadmin-u-f283ea9bea0e">{website}</span></div>
        {/if}
        {#if joinedDate}
          <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568"><Calendar class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" /><span>{i18n.t('publicProfile.joinedDate', { date: joinedDate })}</span></div>
        {/if}
      </div>
    {/if}

    <!-- Tags -->
    {#if tags.length > 0}
      <div class="svadmin-u-1bb883263ed2 svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-58284b4ea568">
        {#each tags as tag (tag)}
          <Badge variant="outline" class="svadmin-u-359090c2d529">{tag}</Badge>
        {/each}
      </div>
    {/if}

    <!-- Stats -->
    {#if stats.length > 0}
      <div class="svadmin-u-1bb883263ed2 svadmin-u-f3c543ad5fe9 {statsGridClass} svadmin-u-1004c0c3954c svadmin-u-b950dda299d3 svadmin-u-ce335a8e4f56">
        {#each stats as stat (stat.label)}
          <div class="svadmin-u-ca6bf63030aa">
            <div class="svadmin-u-42536e69e639 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{stat.value}</div>
            <div class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">{stat.label}</div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Followers / Following -->
    {#if followers > 0 || following > 0}
      <div class="svadmin-u-60fbb7713999 svadmin-u-0c3bc98565dd svadmin-u-fc7473ca09eb svadmin-u-b950dda299d3 svadmin-u-ce335a8e4f56">
        {#if followers > 0}
          <span><strong class="svadmin-u-d4108abe6359">{followers}</strong> <span class="svadmin-u-bfa603190748">{i18n.t('publicProfile.followers')}</span></span>
        {/if}
        {#if following > 0}
          <span><strong class="svadmin-u-d4108abe6359">{following}</strong> <span class="svadmin-u-bfa603190748">{i18n.t('publicProfile.following')}</span></span>
        {/if}
      </div>
    {/if}

    <!-- Actions -->
    <div class="svadmin-u-eccd13ef4f2f svadmin-u-60fbb7713999 svadmin-u-77a2a20e90d4">
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
