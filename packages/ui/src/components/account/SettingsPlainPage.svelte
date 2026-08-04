<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '../ui/card/index.js';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Label } from '../ui/label/index.js';
  import { Switch } from '../ui/switch/index.js';
  import { Separator } from '../ui/separator/index.js';
  import { Loader2, Camera, Trash2 } from '@lucide/svelte';

  const i18n = useTranslation();

  let displayName = $state('Alex Chen');
  let email = $state('alex@example.com');
  let phone = $state('+86 138 **** 9527');
  let dateOfBirth = $state('1995-04-18');
  let bio = $state('Full-stack developer focused on design systems and developer tooling.');
  let country = $state('China');
  let region = $state('Shanghai');
  let city = $state('Shanghai');
  let postcode = $state('200120');
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let emailNotifications = $state(true);
  let twoFactor = $state(false);
  let confirmDelete = $state(false);
  let saving = $state(false);

  async function handleSave() {
    saving = true;
    await new Promise((r) => setTimeout(r, 800));
    saving = false;
  }
</script>

<div class="space-y-6" data-svadmin-content-page="account">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-xl font-semibold text-foreground">{i18n.t('account.settingsPlain')}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{i18n.t('account.settingsPlainDescription')}</p>
    </div>
    <Button onclick={handleSave} disabled={saving} size="sm">
      {#if saving}<Loader2 class="h-4 w-4 animate-spin mr-2" />{/if}
      {i18n.t('common.save')}
    </Button>
  </div>

  <!-- General Settings -->
  <Card.Card class="border-border/60">
    <Card.CardHeader>
      <Card.CardTitle class="text-base">{i18n.t('settings.general')}</Card.CardTitle>
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
          <Label for="display-name">{i18n.t('profile.name')}</Label>
          <Input id="display-name" bind:value={displayName} />
        </div>
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input id="email" bind:value={email} type="email" />
        </div>
        <div class="space-y-2">
          <Label for="phone">{i18n.t('account.phone')}</Label>
          <Input id="phone" bind:value={phone} />
        </div>
        <div class="space-y-2">
          <Label for="dob">{i18n.t('account.dateOfBirth')}</Label>
          <Input id="dob" bind:value={dateOfBirth} type="date" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="bio">{i18n.t('account.bio')}</Label>
        <textarea
          id="bio"
          bind:value={bio}
          rows={3}
          class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        ></textarea>
      </div>

      <Separator />

      <div class="flex items-center justify-between gap-4">
        <div class="space-y-1">
          <Label for="email-notif">{i18n.t('notifications.emailTitle')}</Label>
          <p class="text-xs text-muted-foreground">{i18n.t('notifications.emailDescription')}</p>
        </div>
        <Switch id="email-notif" bind:checked={emailNotifications} />
      </div>

      <div class="flex items-center justify-between gap-4">
        <div class="space-y-1">
          <Label for="two-factor">{i18n.t('account.twoFactorAuth')}</Label>
          <p class="text-xs text-muted-foreground">{i18n.t('security.twoFactorDescription')}</p>
        </div>
        <Switch id="two-factor" bind:checked={twoFactor} />
      </div>
    </Card.CardContent>
  </Card.Card>

  <!-- Address -->
  <Card.Card class="border-border/60">
    <Card.CardHeader>
      <Card.CardTitle class="text-base">{i18n.t('account.address')}</Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="country">{i18n.t('account.country')}</Label>
          <Input id="country" bind:value={country} />
        </div>
        <div class="space-y-2">
          <Label for="state">{i18n.t('account.state')}</Label>
          <Input id="state" bind:value={region} />
        </div>
        <div class="space-y-2">
          <Label for="city">{i18n.t('account.city')}</Label>
          <Input id="city" bind:value={city} />
        </div>
        <div class="space-y-2">
          <Label for="postcode">{i18n.t('account.postcode')}</Label>
          <Input id="postcode" bind:value={postcode} />
        </div>
      </div>
    </Card.CardContent>
  </Card.Card>

  <!-- Password -->
  <Card.Card class="border-border/60">
    <Card.CardHeader>
      <Card.CardTitle class="text-base">{i18n.t('account.password')}</Card.CardTitle>
    </Card.CardHeader>
    <Card.CardContent>
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="space-y-2">
          <Label for="current-password">{i18n.t('profile.currentPassword')}</Label>
          <Input id="current-password" bind:value={currentPassword} type="password" />
        </div>
        <div class="space-y-2">
          <Label for="new-password">{i18n.t('profile.newPassword')}</Label>
          <Input id="new-password" bind:value={newPassword} type="password" />
        </div>
        <div class="space-y-2">
          <Label for="confirm-password">{i18n.t('auth.confirmPassword')}</Label>
          <Input id="confirm-password" bind:value={confirmPassword} type="password" />
        </div>
      </div>
    </Card.CardContent>
  </Card.Card>

  <!-- Delete Account -->
  <Card.Card class="border-destructive/30">
    <Card.CardHeader>
      <Card.CardTitle class="text-base text-destructive">{i18n.t('account.deleteAccount')}</Card.CardTitle>
      <Card.CardDescription>{i18n.t('account.deleteAccountDescription')}</Card.CardDescription>
    </Card.CardHeader>
    <Card.CardContent class="space-y-4">
      <div class="flex items-center justify-between gap-4">
        <Label for="confirm-delete" class="text-sm font-normal">{i18n.t('account.confirmDeleteAccount')}</Label>
        <Switch id="confirm-delete" bind:checked={confirmDelete} />
      </div>
      <div class="flex justify-end">
        <Button variant="destructive" size="sm" disabled={!confirmDelete}>
          <Trash2 class="h-4 w-4 mr-1" />{i18n.t('account.deleteAccount')}
        </Button>
      </div>
    </Card.CardContent>
  </Card.Card>
</div>
