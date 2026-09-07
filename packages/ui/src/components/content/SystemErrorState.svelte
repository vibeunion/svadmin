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
<div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-8e63407b5ceb" data-svadmin-system-error>
  <Card.Card class="svadmin-u-6da6a3c3f741 svadmin-u-9794ab45094d"><Card.CardContent class="svadmin-u-b43b4c086d9a svadmin-u-845f53365c8d svadmin-u-ca6bf63030aa"><div class="svadmin-u-0e12dc7de920 svadmin-u-60fbb7713999 svadmin-u-7a9ad020b130 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-5f22e64f2282 svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748">{#if isNotFound}<FileQuestion class="svadmin-u-cc46d0fa277d" />{:else}<AlertTriangle class="svadmin-u-cc46d0fa277d svadmin-u-811148b13d1e" />{/if}</div><div class="svadmin-u-6f7e013d6499"><p class="svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-bfa603190748">{status}</p><h2 class="svadmin-u-d5c9b0001e7e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{resolvedTitle}</h2><p class="svadmin-u-fc7473ca09eb svadmin-u-18550d5945ae svadmin-u-bfa603190748">{resolvedDescription}</p></div>{#if action}<div>{@render action()}</div>{/if}<div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-86843cf1e227 svadmin-u-77a2a20e90d4"><Button variant="outline" onclick={() => adminContext.back()}><ArrowLeft class="svadmin-u-f7b5fa971871" />{i18n.t('common.back')}</Button><Button onclick={() => adminContext.navigate('/')}><Home class="svadmin-u-f7b5fa971871" />{i18n.t('common.returnHome')}</Button></div></Card.CardContent></Card.Card>
</div>
