"""参考契约回归；合成夹具测试解析器，不冒充应用组件行为测试。"""
from __future__ import annotations

import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from validate import KIT, ValidationError, css_rule, declaration, load_json, tokenize, validate_bundle


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.manifest = load_json(KIT / 'manifest.json')
        self.contract = load_json(KIT / 'contract.json')

    def check(self):
        return validate_bundle(self.manifest, self.contract)

    def test_valid_metadata_is_not_source_acceptance(self):
        self.assertEqual(self.check(), {'metadataValid': True, 'sourceChecked': False,
                                       'components': 8, 'patterns': 3, 'states': 18, 'tokenMappings': 15})

    def test_missing_state(self):
        self.contract['patterns'][0]['states'].pop()
        with self.assertRaisesRegex(ValidationError, '缺少必须状态'):
            self.check()

    def test_duplicate_state(self):
        self.contract['patterns'][0]['states'].append(copy.deepcopy(self.contract['patterns'][0]['states'][0]))
        with self.assertRaisesRegex(ValidationError, '重复项'):
            self.check()

    def test_duplicate_pattern(self):
        self.contract['patterns'][2] = copy.deepcopy(self.contract['patterns'][1])
        with self.assertRaisesRegex(ValidationError, '重复项'):
            self.check()

    def test_unknown_component(self):
        self.contract['patterns'][0]['components'].append('UnknownTable')
        with self.assertRaisesRegex(ValidationError, '未知或缺失组件'):
            self.check()

    def test_required_component_cannot_be_dropped(self):
        self.contract['patterns'][0]['components'].remove('ContentPageShell')
        with self.assertRaisesRegex(ValidationError, '未知或缺失组件'):
            self.check()

    def test_feedback_owner_must_exist(self):
        self.contract['patterns'][0]['states'][0]['feedback']['owner'] = 'floating-card'
        with self.assertRaisesRegex(ValidationError, '反馈区域不存在'):
            self.check()

    def test_single_primary_action_owner(self):
        self.contract['patterns'][0]['primaryActionOwner'] = ['header', 'toolbar']
        with self.assertRaises(ValidationError):
            self.check()

    def test_success_cannot_be_persistent_notice(self):
        self.contract['patterns'][2]['states'][4]['feedback']['mode'] = 'inline'
        with self.assertRaisesRegex(ValidationError, 'success.feedback'):
            self.check()

    def test_forbidden_cannot_show_old_data(self):
        self.contract['patterns'][0]['states'][5]['dataVisibility'] = 'authorized'
        with self.assertRaisesRegex(ValidationError, 'forbidden.dataVisibility'):
            self.check()

    def test_no_runtime_registration_or_write_authority(self):
        for key in ['runtimeRegistration', 'businessWriteAuthority', 'arbitraryStyleOrCode',
                    'productionStyleChange', 'thirdPartyAssetsIncluded']:
            with self.subTest(key=key):
                self.contract['boundaries'][key] = True
                with self.assertRaises(ValidationError):
                    self.check()
                self.contract['boundaries'][key] = False

    def test_approval_requires_future_audited_schema_change(self):
        self.manifest['references'][0]['redistributionApproved'] = True
        with self.assertRaisesRegex(ValidationError, 'redistributionApproved'):
            self.check()

    def test_numeric_zero_is_not_false(self):
        self.manifest['references'][0]['redistributionApproved'] = 0
        with self.assertRaises(ValidationError):
            self.check()

    def test_boolean_is_not_schema_version(self):
        self.manifest['schemaVersion'] = True
        with self.assertRaises(ValidationError):
            self.check()

    def test_uninspected_file_cannot_claim_verified(self):
        self.manifest['figma']['contentVerified'] = True
        with self.assertRaisesRegex(ValidationError, 'contentVerified'):
            self.check()

    def test_no_invented_figma_node(self):
        self.manifest['figma']['nodeIds'] = ['1:2']
        with self.assertRaisesRegex(ValidationError, 'nodeIds'):
            self.check()

    def test_figma_url_must_match_created_file(self):
        self.manifest['figma']['url'] += '?node-id=1-2'
        with self.assertRaisesRegex(ValidationError, 'figma.url'):
            self.check()

    def test_reference_url_cannot_change_authority(self):
        for url in ['javascript:alert(1)', 'https://docs.stripe.com.evil.invalid/x',
                    'https://user:password@docs.stripe.com/connect/embedded-appearance-options']:
            with self.subTest(url=url):
                self.manifest['references'][0]['documentationUrl'] = url
                with self.assertRaises(ValidationError):
                    self.check()

    def test_community_id_and_url_must_agree(self):
        self.manifest['references'][0]['communityFileId'] = '123'
        with self.assertRaises(ValidationError):
            self.check()

    def test_duplicate_reference(self):
        self.manifest['references'][1] = copy.deepcopy(self.manifest['references'][0])
        with self.assertRaisesRegex(ValidationError, '重复项'):
            self.check()

    def test_unknown_fields(self):
        self.contract['patterns'][0]['states'][0]['runtimeCallback'] = 'run()'
        with self.assertRaisesRegex(ValidationError, '未知字段'):
            self.check()

    def test_structured_css_value_is_rejected(self):
        self.contract['tokens']['colors']['surface'] = {'value': 'red'}
        with self.assertRaises(ValidationError):
            self.check()

    def test_css_injection_is_rejected(self):
        self.contract['tokens']['colors']['surface'] = '--card);background:url(https://evil.invalid)'
        with self.assertRaises(ValidationError):
            self.check()

    def test_missing_discrepancy(self):
        self.contract['discrepancies'].pop()
        with self.assertRaisesRegex(ValidationError, '两项已知间距差异'):
            self.check()

    def test_discrepancy_cannot_hide_different_code_value(self):
        self.contract['discrepancies'][0]['code'] = '0.5rem'
        with self.assertRaisesRegex(ValidationError, 'discrepancy.code'):
            self.check()

    def test_path_traversal(self):
        self.contract['source']['tokenPath'] = '../../outside.ts'
        with self.assertRaises(ValidationError):
            self.check()

    def test_no_application_pass_without_evidence(self):
        self.contract['acceptanceTargets']['applicationBrowserRegression'] = 'passed'
        with self.assertRaises(ValidationError):
            self.check()

    def test_bad_json_shapes_have_readable_failures(self):
        for key, bad in [('patterns', None), ('tokens', []), ('source', 'main'), ('components', 42)]:
            original = self.contract[key]
            with self.subTest(key=key), self.assertRaises(ValidationError):
                self.contract[key] = bad
                self.check()
            self.contract[key] = original

    def test_duplicate_json_keys_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'x.json'
            path.write_text('{"version":"0.1.0","version":"bad"}')
            with self.assertRaisesRegex(ValidationError, '重复 JSON 键'):
                load_json(path)

    def test_non_finite_json_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'x.json'
            path.write_text('{"value": NaN}')
            with self.assertRaisesRegex(ValidationError, '非有限数字'):
                load_json(path)

    def test_non_object_json_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'x.json'
            path.write_text('[]')
            with self.assertRaises(ValidationError):
                load_json(path)

    def test_oversized_json_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'x.json'
            path.write_text(' ' * 1_000_001)
            with self.assertRaisesRegex(ValidationError, '1 MB'):
                load_json(path)

    def test_cli_failure_is_nonzero(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.manifest['purpose'] = 'runtime'
            Path(tmp, 'manifest.json').write_text(json.dumps(self.manifest))
            Path(tmp, 'contract.json').write_text(json.dumps(self.contract))
            result = subprocess.run([sys.executable, str(KIT / 'validate.py'), '--kit', tmp, '--metadata-only'],
                                    text=True, capture_output=True, check=False)
            self.assertEqual(result.returncode, 1)
            self.assertIn('FAIL', result.stderr)
            self.assertEqual(result.stdout, '')

    def test_default_cli_does_not_silently_skip_missing_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = subprocess.run([sys.executable, str(KIT / 'validate.py'), '--source-root', tmp],
                                    text=True, capture_output=True, check=False)
            self.assertEqual(result.returncode, 1)
            self.assertIn('FAIL', result.stderr)


class SourceTests(unittest.TestCase):
    def test_literal_object(self):
        source = "export const t = { colors: { surface: {value: 'var(--card)'} } };"
        self.assertEqual(declaration(tokenize(source), 't'), {'colors': {'surface': {'value': 'var(--card)'}}})

    def test_comments_are_not_declarations(self):
        source = "/* export const t = {a:'bad'}; */ // export const t = {a:'bad'};\nexport const t = {a:'ok'};"
        self.assertEqual(declaration(tokenize(source), 't'), {'a': 'ok'})

    def test_strings_are_not_declarations(self):
        source = '"export const t = {a:1};";'
        with self.assertRaisesRegex(ValidationError, '唯一 export const'):
            declaration(tokenize(source), 't')

    def test_template_text_cannot_forge_recipe(self):
        with self.assertRaisesRegex(ValidationError, '唯一 export const'):
            declaration(tokenize('const example = `const t = tv({a:"fake"});`;'), 't', recipe=True)

    def test_recipe_requires_literal_factory_body(self):
        self.assertEqual(declaration(tokenize('const t = tv({a:"real"});'), 't', recipe=True), {'a': 'real'})
        for source in ['const t = tv({...other});', 'const t = tv({a:read()});',
                       'const t = other({a:"fake"});', 'const t = tv({a:"real"}) || other;']:
            with self.subTest(source=source), self.assertRaises(ValidationError):
                declaration(tokenize(source), 't', recipe=True)

    def test_css_comments_and_strings_cannot_forge_rule(self):
        for source in ['/* :root { --card: white; } */',
                       '.example { content: ":root { --card: white; }"; }']:
            with self.subTest(source=source), self.assertRaisesRegex(ValidationError, '唯一 CSS'):
                css_rule(source, ':root')

    def test_css_duplicate_declarations_and_rules_fail_closed(self):
        for source in [':root { --card: white; --card: red; }',
                       ':root { --card: white; } :root { --card: red; }',
                       ':root { --card: white;']:
            with self.subTest(source=source), self.assertRaises(ValidationError):
                css_rule(source, ':root')

    def test_css_in_unrelated_conditional_scope_is_not_the_root_binding(self):
        with self.assertRaisesRegex(ValidationError, '唯一 CSS'):
            css_rule('@media (width: 0px) { :root { --card: white; } }', ':root')
        self.assertEqual(css_rule('@layer base { :root { --card: white; } }',
                                  ':root', within=('@layer base',)), {'--card': 'white'})

    def test_duplicate_token_keys(self):
        with self.assertRaisesRegex(ValidationError, '重复对象键'):
            declaration(tokenize("export const t = {a:'ok',a:'bad'};"), 't')

    def test_expression_and_spread_fail_closed(self):
        for source in ["export const t = {a: evaluate()};", "export const t = {...other};",
                       "export const t = {a:'ok'} satisfies Token;", "export const t = {a:'ok'} + extra;"]:
            with self.subTest(source=source), self.assertRaises(ValidationError):
                declaration(tokenize(source), 't')

    def test_duplicate_exports(self):
        with self.assertRaisesRegex(ValidationError, '唯一 export const'):
            declaration(tokenize("export const t = {a:'a'}; export const t = {a:'b'};"), 't')

    def test_bounded_depth(self):
        source = 'export const t = ' + '{a:' * 12 + "'x'" + '}' * 12 + ';'
        with self.assertRaisesRegex(ValidationError, '有界'):
            declaration(tokenize(source), 't')

    def test_truncated_source(self):
        for source in ["export const t = {", "export const t = {a:", "export const t = {a:'ok'"]:
            with self.subTest(source=source), self.assertRaises(ValidationError):
                declaration(tokenize(source), 't')

    def test_missing_source_is_not_a_pass(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(OSError):
                validate_bundle(load_json(KIT / 'manifest.json'), load_json(KIT / 'contract.json'), Path(tmp))

    def test_symlink_cannot_escape_source_root(self):
        from validate import TOKEN_PATH, _source
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / 'root'
            target = root / TOKEN_PATH
            target.parent.mkdir(parents=True)
            outside = Path(tmp) / 'outside.ts'
            outside.write_text('not source')
            target.symlink_to(outside)
            with self.assertRaisesRegex(ValidationError, '符号链接越出'):
                _source(root, TOKEN_PATH)


class SourceMappingTests(unittest.TestCase):
    """使用真实仓库源码或显式提供的完整源码快照，逐项制造漂移。"""
    def setUp(self):
        import os
        import shutil
        from validate import TOKEN_PATH, THEME_PATH, RECIPE_PATH, INDEX_PATH
        source = Path(os.environ.get('SVADMIN_REFERENCE_SOURCE_ROOT', KIT.parents[1]))
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for name in (TOKEN_PATH, THEME_PATH, RECIPE_PATH, INDEX_PATH):
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source / name, target)
        self.token = self.root / TOKEN_PATH
        self.theme = self.root / THEME_PATH
        self.recipe = self.root / RECIPE_PATH
        self.index = self.root / INDEX_PATH
        self.manifest = load_json(KIT / 'manifest.json')
        self.contract = load_json(KIT / 'contract.json')

    def check(self):
        return validate_bundle(self.manifest, self.contract, self.root)

    def test_actual_source_mapping(self):
        self.assertTrue(self.check()['sourceChecked'])

    def test_source_color_drift(self):
        self.token.write_text(self.token.read_text().replace('var(--card)', 'var(--changed-card)'))
        with self.assertRaisesRegex(ValidationError, 'colors.surface'):
            self.check()

    def test_source_spacing_drift(self):
        self.recipe.write_text(self.recipe.read_text().replace(
            '[--svadmin-metric-state-padding:0.75rem]', '[--svadmin-metric-state-padding:0.5rem]'))
        with self.assertRaisesRegex(ValidationError, 'spacing.sm'):
            self.check()

    def test_theme_color_drift(self):
        self.theme.write_text(self.theme.read_text().replace('--color-card: var(--card)', '--color-card: var(--other)'))
        with self.assertRaisesRegex(ValidationError, 'colors.surface'):
            self.check()

    def test_css_color_alias_comment_is_not_a_binding(self):
        self.token.write_text(self.token.read_text().replace(
            '--color-card: var(--card);', '/* --color-card: var(--card); */'))
        with self.assertRaisesRegex(ValidationError, 'colors.surface'):
            self.check()

    def test_missing_actual_dark_variable(self):
        self.token.write_text(self.token.read_text().replace('--success:', '--removed-success:'))
        with self.assertRaisesRegex(ValidationError, 'colors.success'):
            self.check()

    def test_radius_drift(self):
        self.theme.write_text(self.theme.read_text().replace('--radius-lg: var(--radius);', '--radius-lg: 1rem;'))
        with self.assertRaisesRegex(ValidationError, 'radii.surface'):
            self.check()

    def test_recipe_status_color_drift(self):
        self.recipe.write_text(self.recipe.read_text().replace(
            '[--svadmin-status-color:var(--success)]', '[--svadmin-status-color:var(--warning)]'))
        with self.assertRaisesRegex(ValidationError, 'colors.success'):
            self.check()

    def test_recipe_surface_binding_drift(self):
        self.recipe.write_text(self.recipe.read_text().replace('bg-card p-4', 'bg-primary p-4'))
        with self.assertRaisesRegex(ValidationError, 'metricBlockRecipeStyles'):
            self.check()

    def test_css_spacing_and_font_drift(self):
        original = self.token.read_text()
        for old, new, error in [('gap: 0.25rem;', 'gap: 0.5rem;', 'spacing.xs'),
                                ('gap: 1rem;', 'gap: 2rem;', 'spacing.md'),
                                ('font-size: 0.75rem;', 'font-size: 1rem;', 'fontSizes.compact'),
                                ('font-size: 0.875rem;', 'font-size: 1rem;', 'fontSizes.body')]:
            with self.subTest(error=error):
                self.token.write_text(original.replace(old, new))
                with self.assertRaisesRegex(ValidationError, error):
                    self.check()
        self.token.write_text(original)

    def test_missing_recipe_source_fails(self):
        self.recipe.unlink()
        with self.assertRaises(OSError):
            self.check()

    def test_removed_export_cannot_be_replaced_by_comment(self):
        self.index.write_text(self.index.read_text().replace('export { default as DataState }', '// export { default as DataState }'))
        with self.assertRaisesRegex(ValidationError, 'DataState'):
            self.check()

    def test_wrong_source_component_path(self):
        self.index.write_text(self.index.read_text().replace('./DataState.svelte', './OtherState.svelte'))
        with self.assertRaisesRegex(ValidationError, '源路径不匹配'):
            self.check()

    def test_duplicate_component_export(self):
        self.index.write_text(self.index.read_text() + "export { default as DataState } from './DataState.svelte';\n")
        with self.assertRaisesRegex(ValidationError, '唯一默认导出'):
            self.check()

    def test_modified_contract_binding_is_not_valid_source(self):
        self.contract['tokens']['colors']['surface'] = '--wrong-but-valid-name'
        with self.assertRaisesRegex(ValidationError, 'colors.surface'):
            self.check()


class PreviewTests(unittest.TestCase):
    def test_deterministic_and_full_state_coverage(self):
        from render_preview import render
        manifest, contract = load_json(KIT / 'manifest.json'), load_json(KIT / 'contract.json')
        first = render(manifest, contract)
        self.assertEqual(first, render(manifest, contract))
        self.assertEqual(first.count('data-state='), 18)
        self.assertEqual(first.count('data-pattern='), 3)
        self.assertNotIn('<script', first)
        self.assertNotIn('<form', first)
        self.assertNotIn('packages/ui/design/tokens.ts', first)
        for name in ('tokenPath', 'themePath', 'recipePath'):
            self.assertIn(contract['source'][name], first)

    def test_text_is_escaped_not_executed(self):
        from render_preview import render
        manifest, contract = load_json(KIT / 'manifest.json'), load_json(KIT / 'contract.json')
        contract['patterns'][0]['states'][0]['acceptance'] = '<img src=x onerror=alert(1)>'
        rendered = render(manifest, contract)
        self.assertNotIn('<img', rendered)
        self.assertIn('&lt;img src=x onerror=alert(1)&gt;', rendered)

    def test_invalid_metadata_does_not_render(self):
        from render_preview import render
        manifest, contract = load_json(KIT / 'manifest.json'), load_json(KIT / 'contract.json')
        contract['patterns'].pop()
        with self.assertRaises(ValidationError):
            render(manifest, contract)


if __name__ == '__main__':
    unittest.main()
