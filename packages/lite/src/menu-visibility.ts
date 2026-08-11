import type { MenuItem, ResourceDefinition } from '@svadmin/core';

export type MenuAccessCheck = (resource: string, action: string) => boolean;

function passesMenuAccess(
  resource: string,
  action: string,
  canAccess?: MenuAccessCheck,
): boolean {
  if (!canAccess) return true;

  try {
    return canAccess(resource, action);
  } catch {
    // Permission callbacks fail closed so an evaluator error cannot expose navigation.
    return false;
  }
}

export function filterVisibleResources(
  resources: ResourceDefinition[],
  canAccess?: MenuAccessCheck,
): ResourceDefinition[] {
  return resources.filter((resource) => resource.showInMenu !== false
    && passesMenuAccess(resource.name, 'list', canAccess));
}

export function filterVisibleMenu(
  menuEntries: MenuItem[],
  canAccess?: MenuAccessCheck,
): MenuItem[] {
  const visibleEntries: MenuItem[] = [];

  for (const menuEntry of menuEntries) {
    if (menuEntry.meta?.hidden) continue;
    if (menuEntry.meta?.resource
      && !passesMenuAccess(menuEntry.meta.resource, menuEntry.meta.action ?? 'list', canAccess)) {
      continue;
    }

    const visibleChildren = menuEntry.children
      ? filterVisibleMenu(menuEntry.children, canAccess)
      : undefined;
    if (!menuEntry.href && menuEntry.children && menuEntry.children.length > 0
      && visibleChildren?.length === 0) continue;
    visibleEntries.push({ ...menuEntry, ...(visibleChildren ? { children: visibleChildren } : {}) });
  }

  return visibleEntries;
}
