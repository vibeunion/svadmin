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
    const alias = tab === "api-keys" ? "api" : tab === "audit-logs" ? "audit" : tab;
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

<div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-2adea12c41f3 svadmin-u-63a285be6490 svadmin-u-7a09f4b2d159">
  <!-- Left sidebar navigation -->
  <nav class="svadmin-u-6da6a3c3f741 svadmin-u-de96100841e6 svadmin-u-012fbd121f37 svadmin-u-8a25a995eb8e svadmin-u-7f044b149379 svadmin-u-2b64ecb90ede svadmin-u-18f4ce4080f9">
    <!-- Mobile: horizontal scroll tabs -->
    <div class="svadmin-u-60fbb7713999 svadmin-u-a327049cac5b svadmin-u-1384f66f41d0 svadmin-u-f0faeb26d656 svadmin-u-03b4dd7f172b svadmin-u-44ee8ba0a421">
      {#each resolvedSections as section, _i (_i)}
        {#each section.items as item, _j (_j)}
          {@const active = activeKey === item.key}
          <button
            class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-421ac2be5045 svadmin-u-e82ae8be04aa svadmin-u-ceb69a6b0e5f
              {active ? 'svadmin-u-e6f9e383a762 svadmin-u-d4108abe6359 svadmin-u-438b2237b8d6' : 'svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e svadmin-u-d01723c1dc46'}"
            onclick={() => adminContext.navigate(item.path)}
          >
            <item.icon class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
            {i18n.t(item.label)}
          </button>
        {/each}
      {/each}
    </div>

    <!-- Desktop: vertical nav with groups -->
    <div class="svadmin-u-99d72c7fc3e2 svadmin-u-d0ce7c24d9dd svadmin-u-940911bf310c svadmin-u-0e17f2bd9074 svadmin-u-b3542e058833">
      <div class="svadmin-u-0e17f2bd9074">
        <h2 class="svadmin-u-42536e69e639 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t("settings.title")}</h2>
        <p class="svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-b6b02c0ebef6">{i18n.t("settings.settingsDescription")}</p>
      </div>
      {#each resolvedSections as section, _i (_i)}
        <div>
          <h3 class="svadmin-u-0e17f2bd9074 svadmin-u-65281709dacf svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-bfa603190748">
            {i18n.t(section.group)}
          </h3>
          <div class="svadmin-u-e2eedc5718f0">
            {#each section.items as item, _j (_j)}
              {@const active = activeKey === item.key}
              <button
                class="svadmin-u-60fbb7713999 svadmin-u-6da6a3c3f741 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c svadmin-u-5f22e64f2282 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-fc7473ca09eb svadmin-u-0fe7d7d814d0
                  {active
                    ? 'svadmin-u-375dc44df6e9 svadmin-u-20aaf08a7ed1 svadmin-u-2689f3958069'
                    : 'svadmin-u-bfa603190748 svadmin-u-0557b88819cd svadmin-u-3a99b2b8fbbe'}"
                onclick={() => adminContext.navigate(item.path)}
              >
                <item.icon class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-012fbd121f37" />
                {i18n.t(item.label)}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </nav>

  <!-- Right content area -->
  <div class="svadmin-u-7e0b7cdf1a94 svadmin-u-6da6a3c3f741 svadmin-u-36e579c0b41c svadmin-u-0478c89a150f svadmin-u-793c2275b157 {contentWidth}">
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
