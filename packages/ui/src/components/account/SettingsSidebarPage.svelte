<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '../ui/card/index.js';
  import { Button } from '../ui/button/index.js';
  import { Badge } from '../ui/badge/index.js';
  import { Input } from '../ui/input/index.js';
  import { Label } from '../ui/label/index.js';
  import { Switch } from '../ui/switch/index.js';
  import { Separator } from '../ui/separator/index.js';
  import { Loader2, Camera, Key, Copy, Check } from '@lucide/svelte';

  const i18n = useTranslation();

  const navItems = [
    { id: 'basic', label: 'account.basicSettings' },
    { id: 'signin', label: 'account.socialSignIn' },
    { id: 'password', label: 'account.password' },
    { id: 'sso', label: 'account.singleSignOn' },
    { id: 'preferences', label: 'account.preferences' },
    { id: 'address', label: 'account.address' },
    { id: 'api', label: 'account.manageApi' },
    { id: 'delete', label: 'account.deleteAccount' },
  ];

  let activeSection = $state('basic');

  function scrollTo(id: string) {
    activeSection = id;
    if (typeof document !== 'undefined') {
      document.getElementById(`settings-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  let displayName = $state('Alex Chen');
  let company = $state('Nebula Labs');
  let phone = $state('+86 138 **** 9527');
  let email = $state('alex@example.com');
  let availableToHire = $state(true);
  let profileVisible = $state(true);
  let socialGithub = $state(true);
  let socialGoogle = $state(false);
  let twoFactor = $state(true);
  let language = $state('en');
  let timezone = $state('Asia/Shanghai');
  let currency = $state('CNY');
  let apiKey = $state('sv_demo_pub_9f3e••••41ab');
  let copied = $state(false);
  let saving = $state(false);

  async function handleSave() {
    saving = true;
    await new Promise((r) => setTimeout(r, 800));
    saving = false;
  }

  async function copyApiKey() {
    try {
      await navigator.clipboard.writeText(apiKey);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      copied = false;
    }
  }
</script>

<div class="space-y-6" data-svadmin-content-page="account">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-xl font-semibold text-foreground">{i18n.t('account.settingsSidebar')}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{i18n.t('account.settingsSidebarDescription')}</p>
    </div>
    <Button onclick={handleSave} disabled={saving} size="sm">
      {#if saving}<Loader2 class="h-4 w-4 animate-spin mr-2" />{/if}
      {i18n.t('common.save')}
    </Button>
  </div>

  <div class="flex flex-col gap-6 lg:flex-row">
    <!-- Anchor nav -->
    <nav class="w-full shrink-0 lg:w-52">
      <div class="flex gap-1 overflow-x-auto lg:sticky lg:top-6 lg:flex-col">
        {#each navItems as item (item.id)}
          <button
            class="whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors
              {activeSection === item.id ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
            onclick={() => scrollTo(item.id)}
          >
            {i18n.t(item.label)}
          </button>
        {/each}
      </div>
    </nav>

    <div class="min-w-0 flex-1 space-y-6">
      <!-- Basic Settings -->
      <Card.Card class="border-border/60 scroll-mt-6" id="settings-section-basic">
        <Card.CardHeader>
          <Card.CardTitle class="text-base">{i18n.t('account.basicSettings')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="space-y-4">
          <div class="flex items-center gap-4">
            <div class="relative">
              <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">AC</div>
              <button class="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Camera class="h-3 w-3" />
              </button>
            </div>
            <div>
              <p class="text-sm font-medium text-foreground">{i18n.t('account.photo')}</p>
              <p class="text-xs text-muted-foreground">150x150px JPEG, PNG Image</p>
            </div>
          </div>
          <Separator />
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="sb-name">{i18n.t('profile.name')}</Label>
              <Input id="sb-name" bind:value={displayName} />
            </div>
            <div class="space-y-2">
              <Label for="sb-company">{i18n.t('profile.company')}</Label>
              <Input id="sb-company" bind:value={company} />
            </div>
            <div class="space-y-2">
              <Label for="sb-phone">{i18n.t('account.phone')}</Label>
              <Input id="sb-phone" bind:value={phone} />
            </div>
            <div class="space-y-2">
              <Label for="sb-email">Email</Label>
              <Input id="sb-email" bind:value={email} type="email" />
            </div>
          </div>
          <Separator />
          <div class="flex items-center justify-between gap-4">
            <div class="space-y-1">
              <Label for="sb-visibility">{i18n.t('account.visibility')}</Label>
              <p class="text-xs text-muted-foreground">{i18n.t('account.publicProfileCard')}</p>
            </div>
            <Switch id="sb-visibility" bind:checked={profileVisible} />
          </div>
          <div class="flex items-center justify-between gap-4">
            <div class="space-y-1">
              <Label for="sb-availability">{i18n.t('account.availability')}</Label>
              <p class="text-xs text-muted-foreground">{i18n.t('account.availableToHire')}</p>
            </div>
            <Switch id="sb-availability" bind:checked={availableToHire} />
          </div>
        </Card.CardContent>
      </Card.Card>

      <!-- Social Sign in + 2FA -->
      <Card.Card class="border-border/60 scroll-mt-6" id="settings-section-signin">
        <Card.CardHeader>
          <Card.CardTitle class="text-base">{i18n.t('account.socialSignIn')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="space-y-4">
          <div class="flex items-center justify-between gap-4">
            <div class="space-y-1">
              <Label for="sb-github">Source Control</Label>
              <p class="text-xs text-muted-foreground">alexchen</p>
            </div>
            <Switch id="sb-github" bind:checked={socialGithub} />
          </div>
          <div class="flex items-center justify-between gap-4">
            <div class="space-y-1">
              <Label for="sb-google">Identity Cloud</Label>
              <p class="text-xs text-muted-foreground">alex@example.com</p>
            </div>
            <Switch id="sb-google" bind:checked={socialGoogle} />
          </div>
          <Separator />
          <div class="flex items-center justify-between gap-4">
            <div class="space-y-1">
              <Label for="sb-2fa">{i18n.t('account.twoFactorAuth')}</Label>
              <p class="text-xs text-muted-foreground">{i18n.t('security.twoFactorDescription')}</p>
            </div>
            <div class="flex items-center gap-2">
              <Badge variant="secondary" class="text-[10px]">{twoFactor ? i18n.t('security.twoFactorActive') : i18n.t('security.twoFactorInactive')}</Badge>
              <Switch id="sb-2fa" bind:checked={twoFactor} />
            </div>
          </div>
        </Card.CardContent>
      </Card.Card>

      <!-- Password -->
      <Card.Card class="border-border/60 scroll-mt-6" id="settings-section-password">
        <Card.CardHeader>
          <Card.CardTitle class="text-base">{i18n.t('account.password')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="space-y-2">
              <Label for="sb-current-pw">{i18n.t('profile.currentPassword')}</Label>
              <Input id="sb-current-pw" type="password" />
            </div>
            <div class="space-y-2">
              <Label for="sb-new-pw">{i18n.t('profile.newPassword')}</Label>
              <Input id="sb-new-pw" type="password" />
            </div>
            <div class="space-y-2">
              <Label for="sb-confirm-pw">{i18n.t('auth.confirmPassword')}</Label>
              <Input id="sb-confirm-pw" type="password" />
            </div>
          </div>
        </Card.CardContent>
      </Card.Card>

      <!-- SSO -->
      <Card.Card class="border-border/60 scroll-mt-6" id="settings-section-sso">
        <Card.CardHeader>
          <Card.CardTitle class="text-base">{i18n.t('account.singleSignOn')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="sb-client-id">Client ID</Label>
              <Input id="sb-client-id" placeholder="xxxxxxxx-xxxx-xxxx" />
            </div>
            <div class="space-y-2">
              <Label for="sb-client-secret">Client Secret</Label>
              <Input id="sb-client-secret" type="password" placeholder="••••••••" />
            </div>
          </div>
        </Card.CardContent>
      </Card.Card>

      <!-- Preferences -->
      <Card.Card class="border-border/60 scroll-mt-6" id="settings-section-preferences">
        <Card.CardHeader>
          <Card.CardTitle class="text-base">{i18n.t('account.preferences')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="space-y-2">
              <Label for="sb-language">{i18n.t('account.language')}</Label>
              <select id="sb-language" bind:value={language} class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="en">English</option>
                <option value="zh-CN">中文（简体）</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label for="sb-timezone">{i18n.t('account.timezone')}</Label>
              <select id="sb-timezone" bind:value={timezone} class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="Asia/Shanghai">Asia/Shanghai (GMT+8)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (GMT-7)</option>
                <option value="Europe/Berlin">Europe/Berlin (GMT+2)</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label for="sb-currency">{i18n.t('account.currency')}</Label>
              <select id="sb-currency" bind:value={currency} class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="CNY">CNY (¥)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </Card.CardContent>
      </Card.Card>

      <!-- Address -->
      <Card.Card class="border-border/60 scroll-mt-6" id="settings-section-address">
        <Card.CardHeader>
          <Card.CardTitle class="text-base">{i18n.t('account.address')}</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="sb-country">{i18n.t('account.country')}</Label>
              <Input id="sb-country" value="China" />
            </div>
            <div class="space-y-2">
              <Label for="sb-city">{i18n.t('account.city')}</Label>
              <Input id="sb-city" value="Shanghai" />
            </div>
          </div>
        </Card.CardContent>
      </Card.Card>

      <!-- Manage API -->
      <Card.Card class="border-border/60 scroll-mt-6" id="settings-section-api">
        <Card.CardHeader>
          <Card.CardTitle class="flex items-center gap-2 text-base">
            <Key class="h-4 w-4 text-muted-foreground" />{i18n.t('account.manageApi')}
          </Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent>
          <div class="flex items-center gap-2">
            <Input readonly value={apiKey} class="h-9 font-mono text-xs" />
            <Button size="sm" variant="outline" onclick={copyApiKey}>
              {#if copied}<Check class="h-4 w-4 text-green-500" />{:else}<Copy class="h-4 w-4" />{/if}
            </Button>
            <Button size="sm" variant="ghost">{i18n.t('api.regenerate')}</Button>
          </div>
        </Card.CardContent>
      </Card.Card>

      <!-- Delete Account -->
      <Card.Card class="border-destructive/30 scroll-mt-6" id="settings-section-delete">
        <Card.CardHeader>
          <Card.CardTitle class="text-base text-destructive">{i18n.t('account.deleteAccount')}</Card.CardTitle>
          <Card.CardDescription>{i18n.t('account.deleteAccountDescription')}</Card.CardDescription>
        </Card.CardHeader>
        <Card.CardContent>
          <div class="flex justify-end">
            <Button variant="destructive" size="sm">{i18n.t('account.deleteAccount')}</Button>
          </div>
        </Card.CardContent>
      </Card.Card>
    </div>
  </div>
</div>
