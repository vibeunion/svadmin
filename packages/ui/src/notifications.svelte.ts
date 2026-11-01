import { getContext, onDestroy, setContext } from 'svelte';

export type NotificationTone = 'info' | 'success' | 'warning' | 'danger';
export type NotificationPlacement = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface NotificationOptions {
  key?: string;
  title: string;
  description?: string;
  tone?: NotificationTone;
  placement?: NotificationPlacement;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export interface NotificationRecord extends NotificationOptions {
  id: number;
  tone: NotificationTone;
  placement: NotificationPlacement;
  duration: number;
}

export interface NotificationController {
  readonly items: NotificationRecord[];
  open(options: NotificationOptions): number;
  close(id: number): void;
  closeByKey(key: string): void;
  clear(): void;
  info(title: string, description?: string, options?: Omit<NotificationOptions, 'title' | 'description' | 'tone'>): number;
  success(title: string, description?: string, options?: Omit<NotificationOptions, 'title' | 'description' | 'tone'>): number;
  warning(title: string, description?: string, options?: Omit<NotificationOptions, 'title' | 'description' | 'tone'>): number;
  danger(title: string, description?: string, options?: Omit<NotificationOptions, 'title' | 'description' | 'tone'>): number;
}

type ToneOptions = Omit<NotificationOptions, 'title' | 'description' | 'tone'>;

export function createNotificationController(): NotificationController {
  let nextId = 0;
  let items = $state<NotificationRecord[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  function close(id: number): void {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    items = items.filter((item) => item.id !== id);
  }

  function closeByKey(key: string): void {
    for (const item of items.filter((entry) => entry.key === key)) close(item.id);
  }

  function clear(): void {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    items = [];
  }

  function open(options: NotificationOptions): number {
    if (options.key) closeByKey(options.key);
    const item: NotificationRecord = {
      ...options,
      id: nextId++,
      tone: options.tone ?? 'info',
      placement: options.placement ?? 'top-right',
      duration: options.duration ?? 5000,
    };
    items = [...items, item];
    if (item.duration > 0) {
      timers.set(item.id, setTimeout(() => close(item.id), item.duration));
    }
    return item.id;
  }

  function withTone(tone: NotificationTone) {
    return (title: string, description?: string, options?: ToneOptions) =>
      open({ ...options, title, ...(description ? { description } : {}), tone });
  }

  return {
    get items() { return items; },
    open,
    close,
    closeByKey,
    clear,
    info: withTone('info'),
    success: withTone('success'),
    warning: withTone('warning'),
    danger: withTone('danger'),
  };
}

const sharedController = createNotificationController();
const mountedControllers = new Set<NotificationController>();
const notificationRoots = new WeakMap<Node, NotificationController>();

const NOTIFICATION_CONTEXT = Symbol('svadmin-notification-controller');

function onlyMountedController(): NotificationController | undefined {
  if (mountedControllers.size !== 1) return undefined;
  for (const controller of mountedControllers) return controller;
  return undefined;
}

function controllerFromFocus(): NotificationController | undefined {
  if (typeof document === 'undefined') return undefined;
  let current: Node | null = document.activeElement;
  while (current) {
    const found = notificationRoots.get(current);
    if (found) return found;
    current = current.parentNode;
  }
  return undefined;
}

/** 聚焦所在的 AdminApp 优先；只有一个已挂载应用时走该应用；否则使用未归属队列。 */
function activeController(): NotificationController {
  return controllerFromFocus() ?? onlyMountedController() ?? sharedController;
}

/**
 * 在 AdminApp（或自定义宿主）初始化时调用，使通知队列只属于当前组件树。
 */
export function provideNotificationController(controller: NotificationController = createNotificationController()): NotificationController {
  setContext(NOTIFICATION_CONTEXT, controller);
  mountedControllers.add(controller);
  onDestroy(() => {
    mountedControllers.delete(controller);
    controller.clear();
  });
  return controller;
}

/** 把 DOM 根和当前树的通知队列关联起来，供命令式 `notification` 在点击时定位宿主。 */
export function bindNotificationRoot(node: HTMLElement, controller: NotificationController) {
  notificationRoots.set(node, controller);
  return {
    destroy() {
      notificationRoots.delete(node);
    },
  };
}

/** 组件初始化时捕获当前树的通知队列。异步回调仍写回这个队列。 */
export function useNotificationController(): NotificationController {
  return getContext<NotificationController | undefined>(NOTIFICATION_CONTEXT) ?? activeController();
}

export function getNotifications(): NotificationRecord[] {
  return activeController().items;
}

export function closeNotification(id: number): void {
  activeController().close(id);
}

export function closeNotificationByKey(key: string): void {
  activeController().closeByKey(key);
}

export function clearNotifications(): void {
  activeController().clear();
}

export const notification: NotificationController = {
  get items() { return activeController().items; },
  open: (options) => activeController().open(options),
  close: (id) => activeController().close(id),
  closeByKey: (key) => activeController().closeByKey(key),
  clear: () => activeController().clear(),
  info: (title, description, options) => activeController().info(title, description, options),
  success: (title, description, options) => activeController().success(title, description, options),
  warning: (title, description, options) => activeController().warning(title, description, options),
  danger: (title, description, options) => activeController().danger(title, description, options),
};
