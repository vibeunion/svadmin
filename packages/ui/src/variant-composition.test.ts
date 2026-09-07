import { describe, expect, it } from 'vitest';
import { alertVariants } from './components/ui/alert/alert-variants.js';
import { avatarVariants } from './components/ui/avatar/avatar-variants.js';
import { badgeVariants } from './components/ui/badge/badge-variants.js';
import { buttonVariants } from './components/ui/button/button-variants.js';

describe('public variant class composition', () => {
  for (const helper of [alertVariants, avatarVariants, badgeVariants, buttonVariants]) {
    it(`${helper.name} preserves nested arrays and conditional objects`, () => {
      const classes = helper({
        class: ['custom-a', false, ['custom-b', null]],
        className: { 'custom-c': true, excluded: false },
      }).split(' ');
      expect(classes).toEqual(expect.arrayContaining(['custom-a', 'custom-b', 'custom-c']));
      expect(classes).not.toContain('excluded');
      expect(classes.join(' ')).not.toContain(',');
    });
  }
});
