"""Apply narrowly scoped reviewed edits once on the immutable migration branch."""
from pathlib import Path
import json
import subprocess

BASE = 'ed7e5c746d658ad06c507be94d89721dff3a205d'
assert subprocess.check_output(['git', 'rev-parse', 'HEAD^'], text=True).strip() == BASE

def edit(path, old, new):
    file = Path(path)
    text = file.read_text()
    assert old in text, (path, old[:80])
    file.write_text(text.replace(old, new))

for label in ['已选择 {count} 条记录', '{count} records selected']:
    value = '处理中...' if label.startswith('已') else 'Processing...'
    edit('packages/core/src/i18n.svelte.ts', f"    'common.selectedCount': '{label}',\n    'common.processing': '{value}',", f"    'common.selectedCount': '{label}',")
edit('packages/surface/src/components/MetricWidget.svelte', '<StatsCard class={metricClasses?.card}', "<StatsCard class={metricClasses?.card ?? ''}")
edit('packages/surface/src/components/MetricWidget.svelte', '    border: 1px solid var(--border);', '    border: 1px solid var(--border);\n    border-inline-start: var(--svadmin-metric-state-border-width, 1px) solid var(--svadmin-metric-state-accent, var(--border));')
edit('packages/ui/design/recipes.ts', "state: { borderInlineStartStyle: 'solid', borderInlineStartWidth: '3px' },", "state: { '--svadmin-metric-state-border-width': '3px' },")
edit('packages/ui/design/recipes.ts', 'state: { borderInlineStartColor: toneTokens[tone] },', "state: { '--svadmin-metric-state-accent': `var(--svadmin-colors-${toneTokens[tone]})` },")
edit('packages/ui/src/app-css.test.ts', "import { describe, expect, it } from 'vitest';", "import { describe, expect, it } from 'vitest';\nimport postcss from 'postcss';")
edit('packages/ui/src/app-css.test.ts', "    expect(css).toContain('border-color: var(--color-border, var(--border));');\n    expect(css).not.toMatch(/border-color:\\s*var\\(--border\\);/);", "    const values: string[] = [];\n    postcss.parse(css).walkRules((rule) => {\n      if (rule.selector !== '*, ::after, ::before') return;\n      rule.walkDecls('border-color', (decl) => { values.push(decl.value); });\n    });\n    expect(values).toEqual(['var(--color-border, var(--border))']);")
edit('packages/ui/scripts/flatten-panda-css.mjs', "import { flattenPandaLayers } from './panda-css-layers.mjs';", "import { flattenPandaLayers } from './panda-css-layers.mjs';\nimport { isolatePandaCss } from './panda-css-isolation.mjs';")
edit('packages/ui/scripts/flatten-panda-css.mjs', 'flattenPandaLayers(root);', 'flattenPandaLayers(root);\nisolatePandaCss(root);')
file = Path('packages/ui/package.json')
pkg = json.loads(file.read_text())
pkg['scripts']['build:styles'] += ' && node scripts/prepare-panda-runtime.mjs'
pkg['scripts']['test:css'] += ' scripts/panda-css-layers.test.mjs scripts/panda-css-isolation.test.mjs'
file.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')
file = Path('packages/surface/package.json')
pkg = json.loads(file.read_text())
pkg['files'].append('STYLING.md')
file.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')
file = Path('packages/ui/scripts/panda-css.test.mjs')
text = file.read_text()
start = text.index("test('every public runtime")
end = text.index("test('Panda recipes", start)
text = text[:start] + '''function assertVariantDeclarations(css) {
  const rulesByClass = new Map();
  postcss.parse(css).walkRules((rule) => {
    selectorParser((selectors) => selectors.walkClasses((node) => {
      const rules = rulesByClass.get(node.value) ?? [];
      rules.push(rule);
      rulesByClass.set(node.value, rules);
    })).processSync(rule.selector);
  });
  let checked = 0;
  function declaration(slotClasses, suffix, property, expected) {
    const names = slotClasses.split(/\\s+/).filter((name) => name.endsWith(suffix));
    assert.equal(names.length, 1, `Expected one ${suffix} class in ${slotClasses}`);
    const name = names[0];
    const values = (rulesByClass.get(name) ?? []).flatMap((rule) => {
      const found = [];
      rule.walkDecls(property, (decl) => found.push(decl.value));
      return found;
    });
    assert.ok(values.includes(expected), `${name}: missing ${property}: ${expected}`);
    checked++;
  }
  const tones = { neutral: 'border', success: 'success', warning: 'warning', danger: 'danger', info: 'info' };
  for (const tone of surfaceDesignContract.metric.tone) {
    for (const density of surfaceDesignContract.metric.density) {
      const slots = surfaceMetric({ tone, density });
      declaration(slots.root, '__root', 'min-width', '0');
      declaration(slots.card, '__card', 'border-inline-start-width', '3px');
      declaration(slots.card, `--tone_${tone}`, 'border-inline-start-color', `var(--svadmin-colors-${tones[tone]})`);
      declaration(slots.state, `--tone_${tone}`, '--svadmin-metric-state-accent', `var(--svadmin-colors-${tones[tone]})`);
      declaration(slots.card, `--density_${density}`, 'padding', `var(--svadmin-spacing-${density === 'compact' ? 'sm' : 'lg'})`);
      declaration(slots.state, `--density_${density}`, '--svadmin-metric-state-height', density === 'compact' ? '4.5rem' : '6rem');
    }
  }
  for (const density of surfaceDesignContract.table.density) {
    const slots = surfaceTable({ density });
    for (const slot of ['head', 'cell']) {
      declaration(slots[slot], `--density_${density}`, 'padding-block', density === 'compact' ? 'var(--svadmin-spacing-xs)' : '0.5rem');
      declaration(slots[slot], `--density_${density}`, 'font-size', `var(--svadmin-font-sizes-${density === 'compact' ? 'compact' : 'body'})`);
    }
    for (const slot of ['header', 'content']) declaration(slots[slot], `--density_${density}`, 'padding-inline', `var(--svadmin-spacing-${density === 'compact' ? 'sm' : 'md'})`);
    declaration(slots.state, `--density_${density}`, '--svadmin-table-state-height', density === 'compact' ? '6rem' : '8rem');
  }
  assert.equal(checked, 74);
}

test('every styled slot and public runtime variant has its required CSS declarations', () => {
  assertVariantDeclarations(read('dist/app.css'));
});

test('variant coverage detects a missing rule rather than passing vacuously', () => {
  const css = postcss.parse(read('dist/app.css'));
  css.walkRules((rule) => {
    if (rule.selector.includes('__card--tone_warning')) rule.remove();
  });
  assert.throws(() => assertVariantDeclarations(css.toString()), /missing border-inline-start-color/);
});

''' + text[end:]
text = text.replace("  assert.ok(!root.toString().includes('!important'));", "  assert.ok(!root.toString().includes('!important'));\n  root.walkDecls((decl) => {\n    if (decl.prop.startsWith('--')) assert.ok(decl.prop.startsWith('--svadmin-'), decl.prop);\n  });")
file.write_text(text)
