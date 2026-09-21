import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
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

  it('does not simulate members or invitations without a directory provider', () => {
    const starter = render(MembersStarterPage);

    expect(starter.getByText('A member directory is not configured. No members or invitations are simulated.')).not.toBeNull();
    expect(starter.queryByRole('table', { name: 'Members' })).toBeNull();
    expect(starter.queryByRole('button', { name: /Send Invite/ })).toBeNull();
  });

  it('shows the empty state from a configured read-only directory', async () => {
    const list = vi.fn(async () => []);
    const starter = render(MembersStarterPage, { memberProvider: { list } });

    expect(await starter.findByText('No matching members')).not.toBeNull();
    expect(list).toHaveBeenCalledTimes(1);
    expect(starter.getByText('This directory is read-only. Invitation delivery is not configured.')).not.toBeNull();
    expect(starter.queryByRole('table', { name: 'Members' })).toBeNull();
  });

  it('does not offer simulated MFA enrollment without a provider', () => {
    const twoFactor = render(TwoFactorAuthPage);

    expect(twoFactor.getByText('Enrollment and verification are not configured. No simulated secrets, recovery codes, or MFA success will be generated.')).not.toBeNull();
    expect(twoFactor.queryByRole('button', { name: 'Two-Factor Authentication Setup' })).toBeNull();
    expect(twoFactor.queryByText('Two-factor authentication is enabled')).toBeNull();
  });

  it('enables MFA only after provider verification and displays returned recovery codes', async () => {
    const begin = vi.fn(async () => ({ secret: 'TEST-ENROLLMENT-SECRET' }));
    const verify = vi.fn(async (_code: string) => ({ recoveryCodes: ['test-recovery-1', 'test-recovery-2'] }));
    const twoFactor = render(TwoFactorAuthPage, { enrollmentProvider: { begin, verify } });

    await fireEvent.click(twoFactor.getByRole('button', { name: 'Two-Factor Authentication Setup' }));
    expect(await twoFactor.findByText('TEST-ENROLLMENT-SECRET')).not.toBeNull();
    expect(begin).toHaveBeenCalledTimes(1);
    expect(verify).not.toHaveBeenCalled();
    expect(twoFactor.queryByText('Two-factor authentication is enabled')).toBeNull();
    await fireEvent.input(twoFactor.getByRole('textbox'), { target: { value: '123456' } });
    await fireEvent.click(twoFactor.getByRole('button', { name: 'Confirm', exact: true }));

    expect(await twoFactor.findByText('Two-factor authentication is enabled')).not.toBeNull();
    expect(verify).toHaveBeenCalledExactlyOnceWith('123456');
    expect(twoFactor.getByText(/test-recovery-1\s+test-recovery-2/)).not.toBeNull();
    expect(twoFactor.queryByText('TEST-ENROLLMENT-SECRET')).toBeNull();
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
