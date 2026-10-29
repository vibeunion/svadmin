<script lang="ts">
  import type { Snippet } from 'svelte';
  import { AlertTriangle, ArrowLeft, FileQuestion, Home } from '@lucide/svelte';
  import { captureAdminContext } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import * as Card from '../ui/card/index.js';
  interface Props { status?: '404' | '500'; title?: string; description?: string; action?: Snippet; }
  let { status = '404', title, description, action }: Props = $props();
  const adminContext = captureAdminContext();
  const i18n = useTranslation();
  const isNotFound = $derived(status === '404');
  const resolvedTitle = $derived(title ?? (isNotFound ? i18n.t('common.pageNotFound') : i18n.t('common.error')));
  const resolvedDescription = $derived(description ?? (isNotFound ? i18n.t('error.pageNotFoundDescription') : i18n.t('error.internalServerErrorDescription')));
</script>
<div class="flex items-center justify-center p-4" data-svadmin-system-error>
  <Card.Card class="w-full max-w-md"><Card.CardContent class="space-y-5 p-8 text-center"><div class="mx-auto flex size-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">{#if isNotFound}<FileQuestion class="size-7" />{:else}<AlertTriangle class="size-7 text-destructive" />{/if}</div><div class="space-y-2"><p class="text-xs font-medium text-muted-foreground">{status}</p><h2 class="text-xl font-semibold text-foreground">{resolvedTitle}</h2><p class="text-sm leading-6 text-muted-foreground">{resolvedDescription}</p></div>{#if action}<div>{@render action()}</div>{/if}<div class="flex flex-wrap justify-center gap-2"><Button variant="outline" onclick={() => adminContext.back()}><ArrowLeft class="size-4" />{i18n.t('common.back')}</Button><Button onclick={() => adminContext.navigate('/')}><Home class="size-4" />{i18n.t('common.returnHome')}</Button></div></Card.CardContent></Card.Card>
</div>
