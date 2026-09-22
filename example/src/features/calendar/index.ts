export { default as CalendarPage } from './CalendarPage.svelte';
export { default as CalendarWorkspacePage } from './CalendarWorkspacePage.svelte';
export { calendarResources } from './resources';

export const loadCalendarPage = () => import('./CalendarPage.svelte');
export const loadCalendarWorkspacePage = () => import('./CalendarWorkspacePage.svelte');
