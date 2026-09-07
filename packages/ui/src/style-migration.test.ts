import { describe, expect, it } from 'vitest';
import { migrateSource } from '../scripts/migrate-utility-class-names.mjs';

describe('utility migration safety', () => {
  it('preserves prop names, map keys and business text', () => {
    const source = `<script>
      let { class: className, "data-slot": dataSlot = "input" } = $props();
      const label = "text-success";
      const toneClass = { "data-slot": "text-success" };
    </script><input data-slot={dataSlot} class="flex" />`;
    const map: Record<string, string> = {};
    const migrated = migrateSource(source, map);
    expect(migrated).toContain('"data-slot": dataSlot');
    expect(migrated).toContain('const label = "text-success"');
    expect(migrated).toContain(`"data-slot": "${map['text-success']}"`);
    expect(migrated).toContain(`class="${map.flex}"`);
    expect(map).not.toHaveProperty('data-slot');
    expect(migrateSource(migrated, map)).toBe(migrated);
  });

  it('keeps dynamic template fragments intact and migrates class directives', () => {
    const source = '<script>let active = true; let size = 4;</script><div class={`h-${size}`} class:hidden={active}></div>';
    const map: Record<string, string> = {};
    const migrated = migrateSource(source, map);
    expect(migrated).toContain('class={`h-${size}`}');
    expect(migrated).toContain(`class:${map.hidden}={active}`);
    expect(map).not.toHaveProperty('h-');
  });

  it('migrates static templates without corrupting their delimiters', () => {
    const migrated = migrateSource('<div class={`flex items-center`}></div>');
    expect(migrated).toMatch(/class=\{`svadmin-u-\w+ svadmin-u-\w+`\}/);
  });

  it('fails closed on invalid component source', () => {
    expect(() => migrateSource('<div>{#if')).toThrow();
  });

  it('does not rename values used to choose a class', () => {
    const source = '<script>let variant = "underline";</script><div class={variant === "underline" ? "border-b" : "block"}></div>';
    const migrated = migrateSource(source);
    expect(migrated).toContain('variant === "underline"');
    expect(migrated).not.toContain('? "border-b"');
  });
});
