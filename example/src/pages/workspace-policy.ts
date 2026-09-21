export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function mondayOffset(year: number, month: number): number {
  return (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
}

export function matchesTodoView(
  todo: { dueDate: string; completed: boolean; priority: string },
  view: string,
  today: string,
): boolean {
  if (view === 'today') return todo.dueDate <= today && !todo.completed;
  if (view === 'upcoming') return todo.dueDate > today && !todo.completed;
  if (view === 'priority') return todo.priority === 'high' && !todo.completed;
  if (view === 'completed') return todo.completed;
  return true;
}
