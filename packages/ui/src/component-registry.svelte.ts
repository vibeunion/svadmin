/**
 * Component Registry — Svelte Context-based DI for component injection.
 *
 * Allows users to override any registered component via the `components`
 * prop on `AdminApp`, while providing sensible defaults.
 */
import { getContext, hasContext, setContext, type Component } from 'svelte';
import type Layout from './components/Layout.svelte';
import type Sidebar from './components/Sidebar.svelte';
import type Header from './components/Header.svelte';
import type LoginPage from './components/LoginPage.svelte';
import type AutoTable from './components/AutoTable.svelte';
import type AutoForm from './components/AutoForm.svelte';
import type ShowPage from './components/ShowPage.svelte';
import type ErrorPage from './components/ErrorPage.svelte';
import type Button from './components/ui/button/button.svelte';
import type Input from './components/ui/input/input.svelte';
import type Badge from './components/ui/badge/badge.svelte';
import type Skeleton from './components/ui/skeleton/skeleton.svelte';
import type Breadcrumbs from './components/Breadcrumbs.svelte';
import type TaskQueueDrawer from './components/TaskQueueDrawer.svelte';

// ─── Overridable component slots ────────────────────────────────
export interface ComponentRegistry {
  // Layout primitives
  Layout: typeof Layout;
  Sidebar: typeof Sidebar;
  Header: typeof Header;

  // Pages
  LoginPage: typeof LoginPage;
  AutoTable: typeof AutoTable;
  AutoForm: typeof AutoForm;
  ShowPage: typeof ShowPage;
  ErrorPage?: typeof ErrorPage;

  // Shadcn primitives
  Button: typeof Button;
  Input: typeof Input;
  Badge: typeof Badge;
  Skeleton: typeof Skeleton;

  // ─── Extended slots (optional) ──────────────────────────────
  // These allow deeper customization without replacing entire Layout/Header.

  /** Custom dashboard page component (replaces default welcome message) */
  DashboardPage?: Component;
  /** Custom breadcrumbs component (replaces built-in Breadcrumbs) */
  Breadcrumbs?: typeof Breadcrumbs;
  /** Custom theme toggle button (replaces built-in Sun/Moon toggle) */
  ThemeToggle?: Component;
  /** Custom user menu / avatar dropdown in the header */
  UserMenu?: Component;
  /** Custom notification panel / bell icon in the header */
  NotificationPanel?: Component;
  /** Custom task queue drawer / task center trigger in the header */
  TaskQueueDrawer?: typeof TaskQueueDrawer;
}

const REGISTRY_KEY = 'svadmin:components';

/** Set the component registry in context (called by AdminApp). */
export function setComponentRegistry(registry: ComponentRegistry): void {
  setContext(REGISTRY_KEY, registry);
}

/** Retrieve the full component registry from context. */
export function getComponentRegistry(): ComponentRegistry | undefined {
  return hasContext(REGISTRY_KEY) ? getContext<ComponentRegistry>(REGISTRY_KEY) : undefined;
}

/** Retrieve a single component by name from the registry. */
export function useComponent<K extends keyof ComponentRegistry>(
  name: K,
): ComponentRegistry[K] {
  const registry = getComponentRegistry();
  if (!registry) throw new Error('Component registry requires an AdminApp context');
  return registry[name];
}
