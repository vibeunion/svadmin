<script lang="ts">
  import { Search, Users, Building, Check, X, ChevronRight, ChevronDown } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { useTranslation } from '@svadmin/core';
  import MediaThumbnail from './content/MediaThumbnail.svelte';

  export interface OrgDepartment {
    id: string;
    name: string;
    children?: OrgDepartment[] | undefined;
  }

  export interface OrgMember {
    id: string;
    name: string;
    avatar?: string | undefined;
    departmentId: string;
    jobTitle?: string | undefined;
    email?: string | undefined;
  }

  export interface OrgTreePickerProps {
    /** Departments hierarchy tree */
    departments: OrgDepartment[];
    /** Flat list of organization members */
    members: OrgMember[];
    /** Bound list of selected user IDs */
    selectedUserIds?: string[] | undefined;
    /** Whether multiple users can be selected (default: true) */
    multiple?: boolean | undefined;
    /** Maximum allowed selections */
    maxCount?: number | undefined;
    /** Additional CSS classes */
    class?: string | undefined;
    /** Callback when selection changes */
    onchange?: ((selectedIds: string[], selectedMembers: OrgMember[]) => void) | undefined;
  }

  let {
    departments = [],
    members = [],
    selectedUserIds = $bindable([]),
    multiple = true,
    maxCount,
    class: className = '',
    onchange,
  }: OrgTreePickerProps = $props();

  const i18n = useTranslation();
  let activeDeptId = $state<string>('');
  let searchQuery = $state('');
  let expandedDepts = $state<Record<string, boolean>>({});

  $effect(() => {
    if (!activeDeptId && departments.length > 0 && departments[0]) {
      activeDeptId = departments[0].id;
    }
  });

  const memberMap = $derived(new Map(members.map((m) => [m.id, m])));

  const displayedMembers = $derived.by(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return members.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.jobTitle?.toLowerCase().includes(q),
      );
    }
    return members.filter((m) => m.departmentId === activeDeptId);
  });

  const selectedMembers = $derived(
    selectedUserIds.map((id) => memberMap.get(id)).filter((m): m is OrgMember => m !== undefined),
  );

  const isCurrentDeptAllSelected = $derived.by(() => {
    if (displayedMembers.length === 0) return false;
    return displayedMembers.every((m) => selectedUserIds.includes(m.id));
  });

  function toggleMember(member: OrgMember) {
    let next: string[];
    if (selectedUserIds.includes(member.id)) {
      next = selectedUserIds.filter((id) => id !== member.id);
    } else {
      if (!multiple) {
        next = [member.id];
      } else {
        if (maxCount && selectedUserIds.length >= maxCount) return;
        next = [...selectedUserIds, member.id];
      }
    }
    selectedUserIds = next;
    onchange?.(next, next.map((id) => memberMap.get(id)).filter((m): m is OrgMember => m !== undefined));
  }

  function toggleSelectAllDept() {
    if (!multiple) return;
    const currentIds = displayedMembers.map((m) => m.id);
    let next: string[];
    if (isCurrentDeptAllSelected) {
      next = selectedUserIds.filter((id) => !currentIds.includes(id));
    } else {
      next = Array.from(new Set([...selectedUserIds, ...currentIds]));
      if (maxCount && next.length > maxCount) {
        next = next.slice(0, maxCount);
      }
    }
    selectedUserIds = next;
    onchange?.(next, next.map((id) => memberMap.get(id)).filter((m): m is OrgMember => m !== undefined));
  }

  function removeSelected(id: string) {
    const next = selectedUserIds.filter((item) => item !== id);
    selectedUserIds = next;
    onchange?.(next, next.map((i) => memberMap.get(i)).filter((m): m is OrgMember => m !== undefined));
  }

  function clearAll() {
    selectedUserIds = [];
    onchange?.([], []);
  }

  function toggleExpandDept(deptId: string, e?: MouseEvent) {
    e?.stopPropagation();
    expandedDepts[deptId] = !expandedDepts[deptId];
  }
</script>

<div
  data-svadmin-component="OrgTreePicker"
  class={cn(
    'flex flex-col lg:flex-row items-stretch border border-border rounded-md bg-card text-card-foreground shadow-xs overflow-hidden h-[540px]',
    className,
  )}
>
  <!-- 第 1 列：部门组织树 -->
  <div class="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-border flex flex-col bg-muted/20">
    <div class="p-3 border-b border-border font-semibold text-xs text-muted-foreground flex items-center gap-1.5">
      <Building size={14} class="text-primary" />
      <span>{i18n.t('org.selectDepartment')}</span>
    </div>
    <div class="flex-1 overflow-y-auto p-2 space-y-0.5">
      {#snippet renderDept(dept: OrgDepartment, level = 0)}
        {@const hasChildren = dept.children && dept.children.length > 0}
        {@const expanded = expandedDepts[dept.id] ?? true}
        {@const isActive = activeDeptId === dept.id}

        <div class="select-none">
          <div
            class={cn(
              'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs cursor-pointer transition-colors hover:bg-accent/60',
              isActive && 'bg-primary/10 text-primary font-medium',
            )}
            style={`padding-left: ${level * 16 + 8}px`}
            onclick={() => { activeDeptId = dept.id; searchQuery = ''; }}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && (activeDeptId = dept.id)}
          >
            <div class="flex items-center gap-1.5 truncate">
              {#if hasChildren}
                <button
                  type="button"
                  class="p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                  onclick={(e) => toggleExpandDept(dept.id, e)}
                  aria-label="Toggle department"
                >
                  {#if expanded}
                    <ChevronDown size={13} />
                  {:else}
                    <ChevronRight size={13} />
                  {/if}
                </button>
              {:else}
                <span class="w-4 inline-block"></span>
              {/if}
              <span class="truncate">{dept.name}</span>
            </div>
          </div>

          {#if hasChildren && expanded && dept.children}
            <div class="mt-0.5">
              {#each dept.children as child (child.id)}
                {@render renderDept(child, level + 1)}
              {/each}
            </div>
          {/if}
        </div>
      {/snippet}

      {#each departments as rootDept (rootDept.id)}
        {@render renderDept(rootDept)}
      {/each}
    </div>
  </div>

  <!-- 第 2 列：成员勾选列表 -->
  <div class="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-border bg-background">
    <div class="p-3 border-b border-border flex items-center justify-between gap-3">
      <div class="relative flex-1">
        <Search size={14} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder={i18n.t('org.searchMember')}
          class="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {#if multiple && !searchQuery.trim()}
        <button
          type="button"
          class="text-xs text-primary hover:underline font-medium shrink-0 cursor-pointer"
          onclick={toggleSelectAllDept}
        >
          {isCurrentDeptAllSelected ? (i18n.locale === 'zh-CN' ? '取消全选' : 'Deselect All') : i18n.t('org.selectAll')}
        </button>
      {/if}
    </div>

    <!-- 成员卡片列表 -->
    <div class="flex-1 overflow-y-auto p-3 space-y-1.5">
      {#each displayedMembers as member (member.id)}
        {@const selected = selectedUserIds.includes(member.id)}
        <div
          class={cn(
            'flex items-center justify-between rounded-lg p-2.5 text-xs border border-transparent transition-all cursor-pointer hover:bg-muted/50',
            selected && 'bg-primary/5 border-primary/20',
          )}
          onclick={() => toggleMember(member)}
          role="checkbox"
          aria-checked={selected}
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && toggleMember(member)}
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border border-border text-[11px] font-semibold text-foreground overflow-hidden">
              {#if member.avatar}
                <MediaThumbnail
                  src={member.avatar}
                  alt={member.name}
                  size="full"
                  fit="cover"
                  showOverlay={false}
                  class="h-full w-full rounded-full border-0"
                />
              {:else}
                {member.name.slice(0, 1).toUpperCase()}
              {/if}
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-medium text-foreground truncate">{member.name}</span>
              {#if member.jobTitle || member.email}
                <span class="text-[11px] text-muted-foreground truncate">{member.jobTitle || member.email}</span>
              {/if}
            </div>
          </div>

          <div
            class={cn(
              'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-sm border border-input transition-colors',
              selected && 'bg-primary border-primary text-primary-foreground',
            )}
          >
            {#if selected}
              <Check size={12} strokeWidth={3} />
            {/if}
          </div>
        </div>
      {/each}

      {#if displayedMembers.length === 0}
        <div class="py-16 text-center text-xs text-muted-foreground">{i18n.t('org.noMembers')}</div>
      {/if}
    </div>
  </div>

  <!-- 第 3 列：已选成员列表 -->
  <div class="w-full lg:w-64 flex flex-col bg-muted/10">
    <div class="p-3 border-b border-border flex items-center justify-between font-semibold text-xs text-muted-foreground">
      <div class="flex items-center gap-1.5">
        <Users size={14} class="text-primary" />
        <span>{i18n.t('org.selectedMembers')} ({selectedUserIds.length})</span>
      </div>
      {#if selectedUserIds.length > 0}
        <button
          type="button"
          class="text-destructive hover:underline text-[11px] font-normal cursor-pointer"
          onclick={clearAll}
        >
          {i18n.t('org.clearAll')}
        </button>
      {/if}
    </div>

    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      {#each selectedMembers as item (item.id)}
        <div class="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs bg-background border border-border shadow-2xs group">
          <div class="flex items-center gap-2 truncate">
            <span class="font-medium text-foreground truncate">{item.name}</span>
            {#if item.jobTitle}
              <span class="text-[10px] text-muted-foreground truncate">({item.jobTitle})</span>
            {/if}
          </div>
          <button
            type="button"
            class="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors cursor-pointer"
            onclick={() => removeSelected(item.id)}
            aria-label={`Remove ${item.name}`}
          >
            <X size={12} />
          </button>
        </div>
      {/each}

      {#if selectedUserIds.length === 0}
        <div class="py-16 text-center text-xs text-muted-foreground">{i18n.t('org.empty')}</div>
      {/if}
    </div>
  </div>
</div>
