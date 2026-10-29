<script lang="ts">
  import { Bookmark, Check, RefreshCw, Star, Trash2 } from '@lucide/svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import * as Popover from './ui/popover/index.js';
  import * as Select from './ui/select/index.js';
  import { decodeSavedListViewAccess } from './saved-list-views.js';
  import type { createSavedListViews } from './saved-list-views.svelte.js';

  type SavedViewsController = ReturnType<typeof createSavedListViews>;

  interface Props {
    /** 由 createSavedListViews 创建；菜单只负责交互，查询与持久化仍由宿主控制。 */
    savedViews: SavedViewsController;
    disabled?: boolean;
    class?: string;
  }

  let { savedViews, disabled = false, class: className = '' }: Props = $props();

  const i18n = useTranslation();
</script>

<Popover.Root bind:open={savedViews.savedViewsOpen}>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button variant="outline" size="sm" class="h-9 px-2.5" {...props} disabled={disabled} aria-label={i18n.t("common.savedViews")}>
        <Bookmark class="h-4 w-4" data-icon="inline-start" /> {savedViews.activeSavedViewName ?? i18n.t("common.savedViews")}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content align="end" class={cn("w-80", className)}>
    <div class="space-y-3">
      <div>
        <h4 class="font-medium text-sm">{i18n.t("common.savedViews")}</h4>
        <p class="mt-1 text-xs text-muted-foreground">{i18n.t("common.savedViewsHint")}</p>
        {#if savedViews.staleSavedViewColumns.length > 0}
          <p role="status">{i18n.t('common.savedViewStaleFields', { count: savedViews.staleSavedViewColumns.length })}</p>
        {/if}
      </div>
      {#if savedViews.remoteViewsLoading}
        <p role="status">{i18n.t('common.loading')}</p>
      {:else if savedViews.remoteViewsFailed}
        <p role="alert">{i18n.t('common.operationFailed')}</p>
        <Button type="button" variant="outline" size="sm" onclick={() => savedViews.reload()}>
          {i18n.t('common.retry')}
        </Button>
      {/if}
      {#if savedViews.savedViewMutationPending}
        <p role="status">{i18n.t('common.loading')}</p>
      {:else if savedViews.savedViewMutationError}
        <p role="alert">{i18n.t(savedViews.savedViewMutationError === 'conflict' ? 'common.viewConflict' : 'common.operationFailed')}</p>
        <Button type="button" variant="outline" size="sm" onclick={() => savedViews.reload()}>
          {i18n.t('common.refresh')}
        </Button>
      {/if}
      {#if savedViews.provider?.save}
        <Select.Root aria-label={i18n.t('common.viewSource')} value={savedViews.savedViewSource} disabled={savedViews.savedViewMutationPending}
          onchange={(event: Event) => {
            if (!(event.currentTarget instanceof HTMLSelectElement)) return;
            const value = event.currentTarget.value;
            if (value === 'local' || value === 'team' || value === 'system') savedViews.savedViewSource = value;
          }}>
          <option value="local">{i18n.t('common.personalView')}</option>
          <option value="team">{i18n.t('common.teamView')}</option>
          <option value="system">{i18n.t('common.systemView')}</option>
        </Select.Root>
      {/if}
      <div class="space-y-1">
        <label class="text-xs text-muted-foreground" for="saved-list-view">{i18n.t("common.currentView")}</label>
        <Select.Root
          id="saved-list-view"
          class="h-9 w-full"
          value={savedViews.activeSavedViewId ?? ""}
          onchange={(event: Event) => {
            if (!(event.currentTarget instanceof HTMLSelectElement)) return;
            const id = event.currentTarget.value;
            const view = savedViews.availableSavedViews.find((candidate) => candidate.id === id);
            if (view) savedViews.applySavedView(view);
            else savedViews.clearActiveSavedView();
          }}
        >
          <option value="">{i18n.t("common.currentView")}</option>
          {#each savedViews.availableSavedViews as view (view.id)}
            <option value={view.id}>{view.name}</option>
          {/each}
        </Select.Root>
      </div>
      <div class="flex gap-2">
        <Input
          aria-label={i18n.t("common.viewName")}
          placeholder={i18n.t("common.viewName")}
          maxlength={60}
          bind:value={savedViews.savedViewName}
          disabled={savedViews.savedViewMutationPending}
          class="h-9"
        />
        <Button size="sm" class="shrink-0" disabled={!savedViews.savedViewName.trim() || savedViews.savedViewMutationPending || savedViews.savedViewMutationError === 'conflict'} onclick={() => savedViews.saveCurrentView()}>
          <Check class="h-4 w-4" data-icon="inline-start" /> {i18n.t("common.saveView")}
        </Button>
      </div>
      {#if savedViews.availableSavedViews.length > 0}
        <div class="space-y-1 border-t border-border pt-2">
          {#each savedViews.availableSavedViews as view (view.id)}
            <div class="flex items-center justify-between gap-2 text-sm">
              <span class="min-w-0 truncate">{view.name}</span>
              {#if (view.source === 'team' || view.source === 'system') && savedViews.provider?.setDefault}
                <button
                  type="button"
                  class="inline-flex shrink-0 text-muted-foreground"
                  aria-label={`${i18n.t(view.default ? 'common.unsetDefaultView' : 'common.setDefaultView')} ${view.name}`}
                  aria-pressed={view.default === true}
                  title={i18n.t(view.default ? 'common.unsetDefaultView' : 'common.setDefaultView')}
                  disabled={view.readOnly === true || !view.version || savedViews.savedViewMutationPending || savedViews.savedViewMutationError === 'conflict'}
                  onclick={() => savedViews.setRemoteDefault(view)}
                >
                  <Star class={view.default ? "font-semibold" : ""} fill={view.default ? "currentColor" : "none"} />
                </button>
              {/if}
              {#if (view.source === 'team' || view.source === 'system') && savedViews.provider?.updateAccess}
                {@const draft = savedViews.accessDrafts.get(view.id)}
                {@const accessMode = draft?.mode ?? view.access?.mode ?? ''}
                <Select.Root
                  aria-label={`${i18n.t('common.viewAccess')} ${view.name}`}
                  value={accessMode}
                  disabled={view.readOnly !== false || !view.version || savedViews.savedViewMutationPending || savedViews.savedViewMutationError === 'conflict'}
                  onchange={(event: Event) => {
                    if (!(event.currentTarget instanceof HTMLSelectElement)) return;
                    const mode = event.currentTarget.value;
                    if (mode === 'team' || mode === 'organization' || mode === 'restricted') {
                      savedViews.accessDrafts.set(view.id, {
                        mode,
                        subjectIds: draft?.subjectIds ?? view.access?.subjectIds ?? [],
                      });
                      if (mode === 'restricted') savedViews.loadAccessSubjects(view);
                    }
                  }}
                >
                  <option value="" disabled>{i18n.t('common.selectOption')}</option>
                  <option value="team">{i18n.t('common.teamView')}</option>
                  <option value="organization">{i18n.t('common.accessOrganization')}</option>
                  <option value="restricted">{i18n.t('common.accessRestricted')}</option>
                </Select.Root>
                {#if accessMode === 'restricted'}
                  {#if savedViews.provider.listAccessSubjects}
                    {@const selected = draft?.subjectIds ?? view.access?.subjectIds ?? []}
                    <div>
                      <Input
                        aria-label={`${i18n.t('common.search')} ${view.name}`}
                        value={savedViews.accessSubjectQueries.get(view.id) ?? ''}
                        disabled={view.readOnly !== false || savedViews.savedViewMutationPending}
                        oninput={(event: Event) => {
                          if (!(event.currentTarget instanceof HTMLInputElement)) return;
                          savedViews.accessSubjectQueries.set(view.id, event.currentTarget.value);
                          savedViews.loadAccessSubjects(view, event.currentTarget.value);
                        }}
                      />
                      <Button type="button" size="sm" variant="outline"
                        aria-label={`${i18n.t('common.refresh')} ${view.name}`}
                        disabled={view.readOnly !== false || savedViews.savedViewMutationPending}
                        onclick={() => savedViews.loadAccessSubjects(view, savedViews.accessSubjectQueries.get(view.id) ?? '')}>
                        <RefreshCw />
                      </Button>
                      {#if savedViews.accessSubjectsLoading.get(view.id)}
                        <span role="status">{i18n.t('common.loading')}</span>
                      {:else if savedViews.accessSubjectsFailed.get(view.id)}
                        <span role="alert">{i18n.t('common.operationFailed')}</span>
                      {:else if savedViews.accessSubjects.has(view.id) && !savedViews.accessSubjects.get(view.id)?.length}
                        <span role="status">{i18n.t('common.noData')}</span>
                      {/if}
                      {#each selected as id (id)}
                        <label>
                          <input type="checkbox" checked
                            disabled={view.readOnly !== false || savedViews.savedViewMutationPending || savedViews.savedViewMutationError === 'conflict'}
                            onchange={() => savedViews.accessDrafts.set(view.id, {
                              mode: 'restricted', subjectIds: selected.filter(candidate => candidate !== id),
                            })} />
                          {savedViews.accessSubjects.get(view.id)?.find(subject => subject.id === id)?.label ?? id}
                        </label>
                      {/each}
                      {#each (savedViews.accessSubjects.get(view.id) ?? []).filter(subject => !selected.includes(subject.id)) as subject (subject.id)}
                        <label>
                          <input type="checkbox"
                            disabled={view.readOnly !== false || savedViews.savedViewMutationPending || savedViews.savedViewMutationError === 'conflict' || selected.length >= 200}
                            onchange={() => savedViews.accessDrafts.set(view.id, {
                              mode: 'restricted', subjectIds: [...selected, subject.id],
                            })} />
                          {subject.label}
                        </label>
                      {/each}
                    </div>
                  {:else}
                  <Input
                    aria-label={`${i18n.t('common.accessSubjects')} ${view.name}`}
                    value={(draft?.subjectIds ?? view.access?.subjectIds ?? []).join(', ')}
                    disabled={view.readOnly !== false || !view.version || savedViews.savedViewMutationPending || savedViews.savedViewMutationError === 'conflict'}
                    oninput={(event: Event) => {
                      if (event.currentTarget instanceof HTMLInputElement) {
                        savedViews.accessDrafts.set(view.id, { mode: 'restricted', subjectIds: event.currentTarget.value.split(',').map(id => id.trim()) });
                      }
                    }}
                  />
                  {/if}
                {/if}
                <Button type="button" size="sm"
                  aria-label={`${i18n.t('common.saveAccess')} ${view.name}`}
                  disabled={!draft || view.readOnly !== false || !view.version
                    || savedViews.savedViewMutationPending || savedViews.savedViewMutationError === 'conflict'
                    || (draft.mode === 'restricted' && !decodeSavedListViewAccess(draft))}
                  onclick={() => savedViews.saveRemoteAccess(view)}>
                  {i18n.t('common.saveAccess')}
                </Button>
              {/if}
              <button
                type="button"
                class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="{i18n.t("common.delete")} {view.name}"
                title="{i18n.t("common.delete")} {view.name}"
                disabled={view.readOnly === true || savedViews.savedViewMutationPending || savedViews.savedViewMutationError === 'conflict'
                  || (!!view.source && !savedViews.provider?.remove)}
                onclick={() => savedViews.deleteSavedView(view.id)}
              >
                <Trash2 class="size-3.5" />
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>
