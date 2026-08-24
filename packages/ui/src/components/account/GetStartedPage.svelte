<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { ArrowRight, Camera, Check, Puzzle, UserPlus, Users } from '@lucide/svelte';
  import * as Card from '../ui/card/index.js';
  import { Badge } from '../ui/badge/index.js';
  import { Button } from '../ui/button/index.js';
  import ContentPageShell from '../content/ContentPageShell.svelte';
  import ContentPageHeader from '../content/ContentPageHeader.svelte';
  import TwoFactorStepper from '../content/TwoFactorStepper.svelte';

  const i18n = useTranslation();
  const steps = [
    { title: i18n.t('account.uploadAvatar'), description: 'Add a recognizable profile image for your workspace.', icon: Camera },
    { title: i18n.t('account.setupProfile'), description: 'Complete your contact details and working preferences.', icon: UserPlus },
    { title: i18n.t('account.connectProvider'), description: 'Connect the services your team uses every day.', icon: Puzzle },
    { title: i18n.t('account.setupTeam'), description: 'Invite teammates and set the right access level.', icon: Users },
  ];
  let completed = $state<boolean[]>(steps.map(() => false));
  let current = $state(0);
  const completedCount = $derived(completed.filter(Boolean).length);
  const progress = $derived(Math.round(completedCount / steps.length * 100));
  function complete(index: number) {
    completed[index] = true;
    current = Math.min(index + 1, steps.length - 1);
  }
</script>

<ContentPageShell pageId="account-get-started" width="narrow">
  <div class="flex items-center justify-between gap-3"><ContentPageHeader title={i18n.t('account.getStarted')} description={i18n.t('account.getStartedDescription')} /><Badge variant="secondary">{progress}%</Badge></div>
  <TwoFactorStepper current={completedCount} steps={steps.map((step) => step.title)} />
  <div class="space-y-3">
    {#each steps as step, index (step.title)}
      <Card.Card class={current === index && !completed[index] ? 'border-primary/40' : ''}>
        <Card.CardContent class="flex items-start gap-4 p-4">
          <span class={'flex size-10 shrink-0 items-center justify-center rounded-md ' + (completed[index] ? 'bg-success/10 text-success' : current === index ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
            {#if completed[index]}<Check class="size-5" />{:else}<step.icon class="size-5" />{/if}
          </span>
          <div class="min-w-0 flex-1"><h2 class="text-sm font-semibold text-foreground">{step.title}</h2><p class="mt-1 text-sm text-muted-foreground">{step.description}</p>{#if current === index && !completed[index]}<Button class="mt-3" size="sm" onclick={() => complete(index)}>{i18n.t('account.completeSetup')}<ArrowRight class="size-3.5" /></Button>{/if}</div>
        </Card.CardContent>
      </Card.Card>
    {/each}
  </div>
</ContentPageShell>
