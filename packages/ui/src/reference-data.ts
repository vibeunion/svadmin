export interface DemoMember { id: string; name: string; email: string; role: string; department: string; status: 'active' | 'invited' | 'inactive'; }
export interface DemoProject { id: string; name: string; description: string; status: 'active' | 'completed' | 'on-hold'; members: number; tasks: number; progress: number; tags: string[]; }
export interface DemoTeam { id: string; name: string; description: string; totalMembers: number; members: Array<{ name: string }> }
export interface DemoIntegration { id: string; name: string; description: string; account: string; connected: boolean; }
export interface DemoApiKey { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string; }
export interface DemoSecurityEvent { id: string; event: string; actor: string; location: string; createdAt: string; severity: 'info' | 'warning' | 'danger'; }
export interface DemoNotification { id: string; title: string; detail: string; unread: boolean; }
export const referenceDemoData = {
  organization: { id: 'acme', name: 'Acme Corporation', plan: 'Enterprise', members: 1250 },
  members: [
    { id: '1', name: 'Alex Chen', email: 'alex@acme.com', role: 'Admin', department: 'Engineering', status: 'active' },
    { id: '2', name: 'Sarah Kim', email: 'sarah@acme.com', role: 'Editor', department: 'Design', status: 'active' },
    { id: '3', name: 'Mike Johnson', email: 'mike@acme.com', role: 'Viewer', department: 'Marketing', status: 'invited' },
    { id: '4', name: 'Lisa Wang', email: 'lisa@acme.com', role: 'Editor', department: 'Engineering', status: 'active' },
    { id: '5', name: 'Tom Brown', email: 'tom@acme.com', role: 'Viewer', department: 'Sales', status: 'inactive' },
  ] satisfies DemoMember[],
  projects: [
    { id: '1', name: 'Dashboard Redesign', description: 'Modern admin dashboard with real-time analytics and customizable widgets.', status: 'active', members: 8, tasks: 34, progress: 72, tags: ['UI', 'Analytics'] },
    { id: '2', name: 'API Gateway v2', description: 'High-performance API gateway with rate limiting and circuit breaker patterns.', status: 'active', members: 5, tasks: 21, progress: 45, tags: ['Backend', 'Infra'] },
    { id: '3', name: 'Mobile App', description: 'Cross-platform mobile application built with shared native modules.', status: 'completed', members: 12, tasks: 56, progress: 100, tags: ['Mobile', 'Product'] },
    { id: '4', name: 'Data Pipeline', description: 'Real-time data processing pipeline for event streaming.', status: 'on-hold', members: 3, tasks: 18, progress: 20, tags: ['Data', 'Streaming'] },
  ] satisfies DemoProject[],
  teams: [
    { id: '1', name: 'Frontend Platform', description: 'Core UI component library and design system.', totalMembers: 8, members: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }] },
    { id: '2', name: 'Backend Services', description: 'API development, services architecture, and reliability.', totalMembers: 5, members: [{ name: 'Dave' }, { name: 'Eve' }] },
    { id: '3', name: 'Design Systems', description: 'Research, visual design, and accessibility standards.', totalMembers: 6, members: [{ name: 'Frank' }, { name: 'Grace' }] },
  ] satisfies DemoTeam[],
  integrations: [
    { id: 'repo', name: 'Source Control', description: 'Pull requests, issues, and repository activity.', account: 'alexchen', connected: true },
    { id: 'chat', name: 'ChatOps', description: 'Team notifications and direct messages.', account: '@alex.chen', connected: true },
    { id: 'drive', name: 'Cloud Drive', description: 'Shared files and document previews.', account: 'alex@example.com', connected: false },
  ] satisfies DemoIntegration[],
  apiKeys: [
    { id: 'key-1', name: 'Local development', prefix: 'sv_demo_dev_', createdAt: '2026-08-01', lastUsedAt: 'Today, 09:20' },
    { id: 'key-2', name: 'CI deploy', prefix: 'sv_demo_ci_', createdAt: '2026-07-18', lastUsedAt: 'Yesterday, 18:02' },
  ] satisfies DemoApiKey[],
  securityEvents: [
    { id: '1', event: 'Login succeeded', actor: 'Alex Chen', location: 'Shanghai, CN', createdAt: '2 minutes ago', severity: 'info' },
    { id: '2', event: 'API key created', actor: 'Alex Chen', location: 'Shanghai, CN', createdAt: '1 hour ago', severity: 'info' },
    { id: '3', event: 'Login failed', actor: 'Unknown', location: 'Unknown', createdAt: '3 hours ago', severity: 'warning' },
  ] satisfies DemoSecurityEvent[],
  notifications: [
    { id: 'n1', title: 'Sarah commented on Dashboard Redesign', detail: '8 minutes ago', unread: true },
    { id: 'n2', title: 'Weekly security summary is ready', detail: 'Yesterday', unread: false },
  ] satisfies DemoNotification[],
};
