export type NotificationTone = 'info' | 'success' | 'warning' | 'danger';

export interface NotificationOptions {
  key?: string;
  title: string;
  description?: string;
  tone?: NotificationTone;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export interface NotificationRecord extends NotificationOptions {
  id: number;
  tone: NotificationTone;
  duration: number;
}

let nextId = 0;
let items = $state<NotificationRecord[]>([]);
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export function getNotifications(): NotificationRecord[] {
  return items;
}

export function closeNotification(id: number): void {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  items = items.filter((item) => item.id !== id);
}

export function closeNotificationByKey(key: string): void {
  for (const item of items.filter((entry) => entry.key === key)) closeNotification(item.id);
}

export function clearNotifications(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  items = [];
}

function open(options: NotificationOptions): number {
  if (options.key) closeNotificationByKey(options.key);
  const item: NotificationRecord = {
    ...options,
    id: nextId++,
    tone: options.tone ?? 'info',
    duration: options.duration ?? 5000,
  };
  items = [...items, item];
  if (item.duration > 0) {
    timers.set(item.id, setTimeout(() => closeNotification(item.id), item.duration));
  }
  return item.id;
}

export const notification = {
  open,
  close: closeNotification,
  closeByKey: closeNotificationByKey,
  clear: clearNotifications,
  info: (title: string, description?: string, options?: Omit<NotificationOptions, 'title' | 'description' | 'tone'>) =>
    open({ ...options, title, ...(description ? { description } : {}), tone: 'info' }),
  success: (title: string, description?: string, options?: Omit<NotificationOptions, 'title' | 'description' | 'tone'>) =>
    open({ ...options, title, ...(description ? { description } : {}), tone: 'success' }),
  warning: (title: string, description?: string, options?: Omit<NotificationOptions, 'title' | 'description' | 'tone'>) =>
    open({ ...options, title, ...(description ? { description } : {}), tone: 'warning' }),
  danger: (title: string, description?: string, options?: Omit<NotificationOptions, 'title' | 'description' | 'tone'>) =>
    open({ ...options, title, ...(description ? { description } : {}), tone: 'danger' }),
};
