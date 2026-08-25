import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const componentSource = (name: string) => readFileSync(
  resolve(root, 'packages/ui/src/components', name),
  'utf8',
);

describe('built-in feedback ownership contract', () => {
  it('lets state-transition auth pages own success without a Toast', () => {
    expect(componentSource('LoginPage.svelte')).toContain('successNotification: false');
    expect(componentSource('ForgotPasswordPage.svelte')).toContain('successNotification: false');
    expect(componentSource('ForgotPasswordPage.svelte')).not.toContain('<CheckCircle');
  });

  it('keeps routine profile and security success out of persistent Alerts', () => {
    const profile = componentSource('ProfilePage.svelte');
    const security = componentSource('SecuritySettings.svelte');
    expect(profile).not.toContain('profileSuccess');
    expect(profile).not.toContain('pwSuccess');
    expect(security).not.toContain('passwordSuccessMessage');
    expect(profile).toContain('notification.success');
    expect(security).toContain('notification.success');
  });
});
