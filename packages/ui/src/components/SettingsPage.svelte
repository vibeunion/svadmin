<script lang="ts">
  import type { Component, Snippet } from "svelte";
  import { captureAdminContext } from "@svadmin/core";
  import { useTranslation } from "@svadmin/core/i18n";

  import { User, Palette, Info, Shield, FileSearch, Lock, Puzzle, Bell, Key } from "@lucide/svelte";
  import ProfilePage from "./ProfilePage.svelte";
  import AppearanceSettings from "./AppearanceSettings.svelte";
  import AboutSettings from "./AboutSettings.svelte";
  import RolesSettings from "./RolesSettings.svelte";
  import AuditLogViewer from "./AuditLogViewer.svelte";
  import SecuritySettings from "./SecuritySettings.svelte";
  import IntegrationsSettings from "./IntegrationsSettings.svelte";
  import NotificationsSettings from "./NotificationsSettings.svelte";
  import ApiSettings from "./ApiSettings.svelte";

  const adminContext = captureAdminContext();
  const authProvider = $derived(adminContext.authProvider);

  interface SettingsItem {
    key: string;
    path: string;
    icon: Component;
    label: string;
  }

  interface SettingsSection {
    group: string;
    items: SettingsItem[];
  }

  interface Props {
    customSections?: SettingsSection[];
    profile?: Snippet;
    appearance?: Snippet;
    roles?: Snippet;
    security?: Snippet;
    integrations?: Snippet;
    notifications?: Snippet;
    api?: Snippet;
    audit?: Snippet;
    about?: Snippet;
    content?: Snippet<[string]>;
  }

  let {
    customSections,
    profile,
    appearance,
    roles,
    security,
    integrations,
    notifications,
    api,
    audit,
    about,
    content,
  }: Props = $props();

  const defaultSections = $derived.by((): SettingsSection[] => [
    {
      group: "settings.general",
      items: [
        { key: "profile", path: "/settings/profile", icon: User, label: "settings.profile" },
        { key: "appearance", path: "/settings/appearance", icon: Palette, label: "settings.appearance" },
        { key: "notifications", path: "/settings/notifications", icon: Bell, label: "settings.notifications" },
      ],
    },
    {
      group: "settings.workspace",
      items: [
        { key: "security", path: "/settings/security", icon: Lock, label: "settings.security" },
        ...(authProvider ? [
          { key: "roles", path: "/settings/roles", icon: Shield, label: "settings.rolesAndPermissions" },
        ] : []),
        { key: "integrations", path: "/settings/integrations", icon: Puzzle, label: "settings.integrations" },
      ],
    },
    {
      group: "settings.developer",
      items: [
        { key: "api", path: "/settings/api", icon: Key, label: "settings.api" },
        ...(authProvider ? [
          { key: "audit", path: "/settings/audit", icon: FileSearch, label: "settings.auditLogs" },
        ] : []),
        { key: "about", path: "/settings/about", icon: Info, label: "settings.about" },
      ],
    },
  ]);

  const resolvedSections = $derived.by(() => {
    if (customSections) return customSections;
    const accountPath = getPath().startsWith('/account/');
    if (!accountPath) return defaultSections;

    return defaultSections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        path: `/account/${item.key === 'api' ? 'api-keys' : item.key}`,
      })),
    }));
  });
  const sectionKeys = $derived(new Set(resolvedSections.flatMap((section) => section.items.map((item) => item.key))));

  import { getParams, getPath, getRoute } from "../router-state.svelte.js";

  const i18n = useTranslation();

  let activeKey = $derived.by(() => {
    const tab = getParams().tab;
    if (!tab) return "profile";
    const alias = tab === "api-keys" ? "api" : tab;
    if (sectionKeys.has(alias)) return alias;
    return content ? alias : "profile";
  });

  const contentWidth = $derived(
    activeKey === 'roles' || activeKey === 'audit'
      ? 'max-w-[92rem]'
      : activeKey === 'api'
        ? 'max-w-[78rem]'
        : activeKey === 'integrations'
          ? 'max-w-[64rem]'
          : 'max-w-3xl',
  );

  // Default redirect to profile
  $effect(() => {
    if (getRoute() === "/settings") {
      adminContext.navigate("/settings/profile");
    }
  });
</script>

<div class="flex flex-col lg:flex-row gap-0 min-h-full">
  <!-- Left sidebar navigation -->
  <nav class="w-full lg:w-56 shrink-0 bg-muted/10 shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)] lg:shadow-[inset_-1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[inset_-1px_0_0_rgba(255,255,255,0.05)]">
    <!-- Mobile: horizontal scroll tabs -->
    <div class="flex lg:hidden overflow-x-auto px-4 py-2 gap-1">
      {#each resolvedSections as section, _i (_i)}
        {#each section.items as item, _j (_j)}
          {@const active = activeKey === item.key}
          <button
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors
              {active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}"
            onclick={() => adminContext.navigate(item.path)}
          >
            <item.icon class="h-4 w-4" />
            {i18n.t(item.label)}
          </button>
        {/each}
      {/each}
    </div>

    <!-- Desktop: vertical nav with groups -->
    <div class="hidden lg:block py-6 px-3 space-y-6">
      <div class="px-3">
        <h2 class="text-lg font-semibold text-foreground">{i18n.t("settings.title")}</h2>
        <p class="text-xs text-muted-foreground mt-1">{i18n.t("settings.settingsDescription")}</p>
      </div>
      {#each resolvedSections as section, _i (_i)}
        <div>
          <h3 class="px-3 mb-1 text-xs font-medium text-muted-foreground">
            {i18n.t(section.group)}
          </h3>
          <div class="space-y-0.5">
            {#each section.items as item, _j (_j)}
              {@const active = activeKey === item.key}
              <button
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all
                  {active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
                onclick={() => adminContext.navigate(item.path)}
              >
                <item.icon class="h-4 w-4 shrink-0" />
                {i18n.t(item.label)}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </nav>

  <!-- Right content area -->
  <div class="min-w-0 w-full flex-1 p-6 lg:p-8 {contentWidth}">
    {#if activeKey === "profile"}
      {#if profile}{@render profile()}{:else}<ProfilePage />{/if}
    {:else if activeKey === "appearance"}
      {#if appearance}{@render appearance()}{:else}<AppearanceSettings />{/if}
    {:else if activeKey === "roles"}
      {#if roles}{@render roles()}{:else}<RolesSettings />{/if}
    {:else if activeKey === "security"}
      {#if security}{@render security()}{:else}<SecuritySettings />{/if}
    {:else if activeKey === "integrations"}
      {#if integrations}{@render integrations()}{:else}<IntegrationsSettings />{/if}
    {:else if activeKey === "notifications"}
      {#if notifications}{@render notifications()}{:else}<NotificationsSettings />{/if}
    {:else if activeKey === "api"}
      {#if api}{@render api()}{:else}<ApiSettings />{/if}
    {:else if activeKey === "audit"}
      {#if audit}{@render audit()}{:else}<AuditLogViewer />{/if}
    {:else if activeKey === "about"}
      {#if about}{@render about()}{:else}<AboutSettings />{/if}
    {:else if content}
      {@render content(activeKey)}
    {/if}
  </div>
</div>
