import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ProjectsGrid from './profile/ProjectsGrid.svelte';
import PublicProfilePage from './profile/PublicProfilePage.svelte';
import MembersStarterPage from './account/MembersStarterPage.svelte';
import TeamsShowcase from './profile/TeamsShowcase.svelte';
import TwoFactorAuthPage from './TwoFactorAuthPage.svelte';
import NetworkTableCompatibilityFixture from './NetworkTable.compatibility.test.svelte';

describe('reference page compatibility', () => {
  it('keeps initialTab reactive and showSections on the variant sections view', async () => {
    const profile = render(PublicProfilePage, { initialTab: 'projects', columns: 2 });

    expect(profile.getByText('Dashboard Redesign')).not.toBeNull();
    expect(profile.getAllByText('6 Projects').length).toBeGreaterThan(0);
    expect(profile.queryByText('Warehouse Console')).toBeNull();
    await profile.rerender({ initialTab: 'projects', columns: 3 });
    expect(profile.getAllByText('12 Projects').length).toBeGreaterThan(0);
    expect(profile.getByText('Warehouse Console')).not.toBeNull();
    await profile.rerender({ initialTab: 'activity' });
    expect(profile.getByText(/Shipped the new dashboard redesign/)).not.toBeNull();

    await profile.rerender({ variant: 'default', showSections: true });
    expect(profile.getByText('About')).not.toBeNull();
    expect(profile.queryByRole('tab', { name: 'Projects' })).toBeNull();
  });

  it('keeps every starter checklist item pending while the workspace has zero members', () => {
    const starter = render(MembersStarterPage);

    expect(starter.getByText('0 members')).not.toBeNull();
    expect(starter.container.querySelectorAll('[data-checklist-status="complete"]')).toHaveLength(0);
    expect(starter.container.querySelectorAll('[data-checklist-status="pending"]')).toHaveLength(3);
  });

  it('shows the enabled state after setup and allows disabling 2FA', async () => {
    const twoFactor = render(TwoFactorAuthPage);

    await fireEvent.click(twoFactor.getByRole('button', { name: /Next/ }));
    await fireEvent.click(twoFactor.getByRole('button', { name: /Next/ }));

    const digits = twoFactor.getAllByRole('textbox');
    for (const [index, input] of digits.entries()) {
      await fireEvent.input(input, { target: { value: String(index + 1) } });
    }
    await fireEvent.click(twoFactor.getByRole('button', { name: /Next/ }));
    await fireEvent.click(twoFactor.getByRole('button', { name: 'Complete Setup' }));

    expect(twoFactor.getByText('Two-factor authentication is enabled')).not.toBeNull();
    await fireEvent.click(twoFactor.getByRole('button', { name: 'Disable Two-Factor Authentication' }));
    expect(twoFactor.getAllByText('Two-Factor Authentication Setup').length).toBeGreaterThan(0);
  });

  it('accepts the legacy rich project and team props', () => {
    const projects = render(ProjectsGrid, {
      projects: [{ id: 'project-1', name: 'Legacy Project', description: 'Project description', members: 3, tasks: 8, status: 'active', image: '/project.png' }],
    });
    const teams = render(TeamsShowcase, {
      teams: [{ id: 'team-1', name: 'Legacy Team', description: 'Team description', totalMembers: 1, color: '#2563eb', rating: 4.9, members: [{ name: 'Alex Chen', role: 'Owner' }] }],
    });

    expect(projects.getByRole('img', { name: 'Legacy Project' })).not.toBeNull();
    expect(teams.getByText('4.9')).not.toBeNull();
  });

  it('renders empty cells instead of undefined for missing network fields', () => {
    const table = render(NetworkTableCompatibilityFixture);

    expect(table.getByRole('cell').textContent).toBe('');
    expect(table.container.textContent).not.toContain('undefined');
  });
});
