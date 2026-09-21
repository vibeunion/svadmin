export interface GanttTaskShape {
  id: string;
  title: string;
  startDay: number;
  durationDays: number;
  progress?: number;
  status?: 'planned' | 'in_progress' | 'completed' | 'delayed';
  dependencies?: string[];
  milestone?: boolean;
}

export type GanttValidationError = 'invalidData' | 'limit' | 'dependency';

export const GANTT_LIMITS = Object.freeze({
  tasks: 1000,
  days: 366,
  cells: 40_000,
  dependencies: 10_000,
});

export function validateGantt<T extends GanttTaskShape>(
  tasks: readonly T[],
  totalDays: number,
): GanttValidationError | undefined {
  if (!Array.isArray(tasks) || !Number.isSafeInteger(totalDays) || totalDays < 1 || totalDays > GANTT_LIMITS.days) {
    return 'invalidData';
  }
  if (tasks.length > GANTT_LIMITS.tasks || tasks.length * totalDays > GANTT_LIMITS.cells) return 'limit';
  const ids = new Set<string>();
  const byId = new Map<string, T>();
  let edgeCount = 0;
  for (const task of tasks) {
    if (!task || typeof task.id !== 'string' || !task.id.trim() || ids.has(task.id)
      || typeof task.title !== 'string' || !task.title.trim()
      || task.id.length > 1000 || task.title.length > 1000
      || !Number.isSafeInteger(task.startDay) || task.startDay < 0
      || !Number.isSafeInteger(task.durationDays)
      || (task.milestone === true ? task.durationDays !== 0 || task.startDay >= totalDays : task.durationDays < 1)
      || task.startDay + task.durationDays > totalDays
      || (task.progress !== undefined && (typeof task.progress !== 'number' || !Number.isFinite(task.progress) || task.progress < 0 || task.progress > 100))
      || (task.status !== undefined && !['planned', 'in_progress', 'completed', 'delayed'].includes(task.status))) {
      return 'invalidData';
    }
    if ((task.milestone !== undefined && typeof task.milestone !== 'boolean')
      || (task.dependencies !== undefined && (!Array.isArray(task.dependencies)
        || task.dependencies.length > GANTT_LIMITS.tasks
        || new Set(task.dependencies).size !== task.dependencies.length
        || task.dependencies.some((dependency: unknown) => typeof dependency !== 'string' || !dependency.trim() || dependency.length > 1000)))) {
      return 'invalidData';
    }
    edgeCount += task.dependencies?.length ?? 0;
    if (edgeCount > GANTT_LIMITS.dependencies) return 'limit';
    ids.add(task.id);
    byId.set(task.id, task);
  }
  const successors = new Map<string, string[]>();
  const remaining = new Map<string, number>();
  const ready: string[] = [];
  for (const task of tasks) {
    remaining.set(task.id, task.dependencies?.length ?? 0);
    if (!task.dependencies?.length) ready.push(task.id);
    for (const dependency of task.dependencies ?? []) {
      const parent = byId.get(dependency);
      if (!parent) return 'dependency';
      if (parent.startDay + parent.durationDays > task.startDay) return 'dependency';
      const children = successors.get(dependency) ?? [];
      children.push(task.id);
      successors.set(dependency, children);
    }
  }
  // 有界迭代拓扑检查，零时长里程碑成环也必须被拒绝。
  for (let index = 0; index < ready.length; index++) {
    const id = ready[index];
    if (id === undefined) return 'dependency';
    for (const child of successors.get(id) ?? []) {
      const pending = remaining.get(child);
      if (pending === undefined) return 'dependency';
      const count = pending - 1;
      remaining.set(child, count);
      if (count === 0) ready.push(child);
    }
  }
  return ready.length === tasks.length ? undefined : 'dependency';
}
