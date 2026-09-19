#!/usr/bin/env python3
"""校验 v0.1 参考资产；只解析声明式源码，不执行 TypeScript 或访问网络。"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path, PurePosixPath
from typing import Any

KIT = Path(__file__).resolve().parent
STATES = {
    'resource-list': ('loading', 'ready', 'empty-first-use', 'empty-filtered', 'error', 'forbidden'),
    'object-detail': ('loading', 'ready', 'partial', 'error', 'forbidden'),
    'settings-form': ('pristine', 'dirty', 'invalid', 'saving', 'success', 'error', 'readonly'),
}
PATTERN_COMPONENTS = {
    'resource-list': {'ContentPageShell', 'ContentPageHeader', 'FilterToolbar', 'DataState'},
    'object-detail': {'ContentPageShell', 'ContentPageHeader', 'DescriptionList', 'StatusBadge', 'DataState'},
    'settings-form': {'ContentPageShell', 'ContentPageHeader', 'SettingsGroup', 'SettingsFieldRow'},
}
COMPONENTS = ('ContentPageShell', 'ContentPageHeader', 'FilterToolbar', 'DataState',
              'DescriptionList', 'StatusBadge', 'SettingsGroup', 'SettingsFieldRow')
REFERENCES = {
    'stripe-connect': ('1438614134095442934', 'https://docs.stripe.com/connect/embedded-appearance-options'),
    'park-foundations': ('1268615283036362769', 'https://park-ui.com/docs/figma'),
}
TOKEN_PATH = 'packages/ui/design/tokens.ts'
INDEX_PATH = 'packages/ui/src/components/content/index.ts'


class ValidationError(ValueError):
    """可读且可由 CLI 返回非零退出码的契约错误。"""


def require(ok: bool, where: str, message: str) -> None:
    if not ok:
        raise ValidationError(f'{where}: {message}')


def fields(value: Any, names: str, where: str) -> dict:
    require(type(value) is dict, where, '必须是对象')
    require(set(value) == set(names.split()), where, '字段缺失或包含未知字段')
    return value


def text(value: Any, where: str) -> None:
    require(isinstance(value, str) and 0 < len(value.strip()) <= 2000, where, '需要非空短文本')


def unique(values: Any, where: str) -> list[str]:
    require(type(values) is list and all(isinstance(v, str) for v in values), where, '需要字符串列表')
    require(len(values) == len(set(values)), where, '不允许重复项')
    return values


def exact(value: Any, expected: Any, where: str) -> None:
    # bool 是 Python 的 int 子类，必须同时检查类型。
    require(type(value) is type(expected) and value == expected, where, f'必须为 {expected!r}')


def _pairs(pairs: list[tuple[str, Any]]) -> dict:
    out = {}
    for key, value in pairs:
        require(key not in out, key, '重复 JSON 键')
        out[key] = value
    return out


def load_json(path: Path) -> dict:
    raw = path.read_bytes()
    require(len(raw) <= 1_000_000, str(path), '文件超过 1 MB 上限')
    def reject_constant(value: str) -> None:
        raise ValidationError(f'{path}: 不允许非有限数字 {value}')
    try:
        value = json.loads(raw, object_pairs_hook=_pairs, parse_constant=reject_constant)
    except (UnicodeError, json.JSONDecodeError, RecursionError) as exc:
        raise ValidationError(f'{path}: 无效 JSON') from exc
    require(type(value) is dict, str(path), '顶层必须是对象')
    return value


def _source(root: Path, relative: str) -> str:
    path = PurePosixPath(relative)
    require(not path.is_absolute() and '..' not in path.parts and '\\' not in relative,
            relative, '非法仓库路径')
    target = (root / relative).resolve()
    require(target.is_relative_to(root.resolve()), relative, '符号链接越出源码根目录')
    raw = target.read_bytes()
    require(len(raw) <= 1_000_000, relative, '源码超过 1 MB 上限')
    return raw.decode('utf-8')


# 这是有意受限的声明式解析器，不是完整 TypeScript AST。表达式、展开、转义字符串
# 等未支持语法会失败，不能靠注释或字符串里的伪声明让映射检查通过。
LEX = re.compile(r'(?P<space>\s+)|(?P<comment>//[^\n]*|/\*.*?\*/)|'
                 r'(?P<string>\'[^\'\\]*\'|"[^"\\]*")|'
                 r'(?P<id>[A-Za-z_$][\w$]*)|(?P<sym>[{}:,;=])|(?P<other>.)', re.S)


def tokenize(source: str) -> list[tuple[str, str]]:
    return [(m.lastgroup, m.group()[1:-1] if m.lastgroup == 'string' else m.group())
            for m in LEX.finditer(source) if m.lastgroup not in ('space', 'comment')]


def declaration(tokens: list[tuple[str, str]], name: str) -> dict:
    prefix = [('id', 'export'), ('id', 'const'), ('id', name), ('sym', '=')]
    starts = [i + 4 for i in range(len(tokens) - 3) if tokens[i:i + 4] == prefix]
    require(len(starts) == 1, name, '需要唯一 export const 声明')
    pos = starts[0]

    def take() -> tuple[str, str]:
        nonlocal pos
        require(pos < len(tokens), name, '声明提前结束')
        token = tokens[pos]
        pos += 1
        return token

    def obj(depth: int = 0) -> dict:
        require(depth < 10 and take() == ('sym', '{'), name, '只支持有界声明式对象')
        result = {}
        while pos < len(tokens) and tokens[pos] != ('sym', '}'):
            kind, key = take()
            require(kind in ('id', 'string') and key not in result, name, '无效或重复对象键')
            require(take() == ('sym', ':'), name, '缺少冒号')
            require(pos < len(tokens), name, '缺少值')
            if tokens[pos] == ('sym', '{'):
                value = obj(depth + 1)
            else:
                kind, value = take()
                require(kind == 'string', name, '只支持字符串 token；表达式需显式适配')
            result[key] = value
            require(pos < len(tokens), name, '声明未闭合')
            if tokens[pos] == ('sym', '}'):
                break
            require(take() == ('sym', ','), name, '缺少逗号')
        require(take() == ('sym', '}'), name, '声明未闭合')
        return result

    value = obj()
    require(pos < len(tokens) and tokens[pos] == ('sym', ';'), name, '不支持声明后置表达式')
    return value


def validate_sources(contract: dict, root: Path) -> None:
    source = contract['source']
    tokens = tokenize(_source(root, source['tokenPath']))
    design = declaration(tokens, 'designTokens')
    semantic = declaration(tokens, 'semanticTokens')
    for category, expected in contract['tokens'].items():
        actual = (design if category in ('spacing', 'fontSizes') else semantic).get(category)
        require(type(actual) is dict, category, '源码缺少 token 分类')
        for key, value in expected.items():
            wanted = value if category in ('spacing', 'fontSizes') else f'var({value})'
            require(actual.get(key) == {'value': wanted}, f'{category}.{key}', '契约与源码 token 不一致')
    exported = tokenize(_source(root, source['componentIndexPath']))
    for name, item in contract['components'].items():
        prefix = [('id', 'export'), ('sym', '{'), ('id', 'default'), ('id', 'as'),
                  ('id', name), ('sym', '}'), ('id', 'from')]
        starts = [i + len(prefix) for i in range(len(exported)) if exported[i:i + len(prefix)] == prefix]
        require(len(starts) == 1, name, '内容组件索引需要唯一默认导出')
        i = starts[0]
        require(i + 1 < len(exported) and exported[i][0] == 'string' and exported[i + 1] == ('sym', ';'),
                name, '不支持的组件导出声明')
        expected_path = str(PurePosixPath(source['componentIndexPath']).parent / exported[i][1])
        require(expected_path == item['sourcePath'], name, '组件源路径不匹配')


def validate_bundle(manifest: dict, contract: dict, source_root: Path | None = None) -> dict:
    fields(manifest, 'schemaVersion id version reviewedOn purpose references figma', 'manifest')
    fields(contract, 'schemaVersion id version source boundaries tokens discrepancies components patterns acceptanceTargets', 'contract')
    for doc in (manifest, contract):
        exact(doc['schemaVersion'], 1, 'schemaVersion')
        exact(doc['id'], 'svadmin-stripe-first-reference-kit', 'id')
        exact(doc['version'], '0.1.0', 'version')
    exact(manifest['purpose'], 'reference-only', 'purpose')
    require(isinstance(manifest['reviewedOn'], str), 'reviewedOn', '需要日期字符串')
    try:
        require(dt.date.fromisoformat(manifest['reviewedOn']).isoformat() == manifest['reviewedOn'],
                'reviewedOn', '需要 ISO 日期')
    except ValueError as exc:
        raise ValidationError('reviewedOn: 无效日期') from exc
    refs = manifest['references']
    require(type(refs) is list and len(refs) == 2, 'references', '只采用两套参考')
    ids = []
    for ref in refs:
        fields(ref, 'id name documentationUrl communityFileId communityUrl role fileInspection licenseReview redistributionApproved', 'reference')
        text(ref['id'], 'reference.id')
        require(ref['id'] in REFERENCES, 'reference.id', '未知参考')
        ids.append(ref['id'])
        file_id, url = REFERENCES[ref['id']]
        exact(ref['documentationUrl'], url, 'documentationUrl')
        exact(ref['communityFileId'], file_id, 'communityFileId')
        exact(ref['communityUrl'], f'https://www.figma.com/community/file/{file_id}', 'communityUrl')
        text(ref['name'], 'reference.name')
        text(ref['role'], 'reference.role')
        exact(ref['fileInspection'], 'unavailable', 'fileInspection')
        exact(ref['licenseReview'], 'pending', 'licenseReview')
        exact(ref['redistributionApproved'], False, 'redistributionApproved')
    unique(ids, 'reference ids')
    figma = fields(manifest['figma'], 'fileKey url status blocker contentVerified nodeIds', 'figma')
    require(isinstance(figma['fileKey'], str) and re.fullmatch(r'[0-9A-Za-z]{22,128}', figma['fileKey']) is not None, 'figma.fileKey', '无效文件 key')
    exact(figma['url'], f'https://www.figma.com/design/{figma["fileKey"]}', 'figma.url')
    for key, expected in {'status':'created-empty', 'blocker':'starter-mcp-quota', 'contentVerified':False, 'nodeIds':[]}.items():
        exact(figma[key], expected, f'figma.{key}')
    source = fields(contract['source'], 'repository commit tokenPath componentIndexPath', 'source')
    exact(source['repository'], 'vibeunion/svadmin', 'source.repository')
    require(isinstance(source['commit'], str) and re.fullmatch(r'[0-9a-f]{40}', source['commit']) is not None, 'source.commit', '需要不可变提交 SHA')
    exact(source['tokenPath'], TOKEN_PATH, 'source.tokenPath')
    exact(source['componentIndexPath'], INDEX_PATH, 'source.componentIndexPath')
    bounds = fields(contract['boundaries'], 'referenceOnly runtimeRegistration productionStyleChange thirdPartyAssetsIncluded arbitraryStyleOrCode businessWriteAuthority', 'boundaries')
    for key, value in bounds.items():
        exact(value, key == 'referenceOnly', f'boundaries.{key}')
    tokens = fields(contract['tokens'], 'colors radii spacing fontSizes', 'tokens')
    for category, keys in {'colors':'surface foreground muted border success warning danger info', 'radii':'surface',
                           'spacing':'xs sm md lg', 'fontSizes':'compact body'}.items():
        for name, value in fields(tokens[category], keys, f'tokens.{category}').items():
            pattern = r'--[a-z][a-z0-9-]*' if category in ('colors', 'radii') else r'(?:0|[1-9]\d*)(?:\.\d+)?rem'
            require(isinstance(value, str) and re.fullmatch(pattern, value) is not None,
                    f'tokens.{category}.{name}', '非法 CSS 变量名或 rem 值')
    gaps = contract['discrepancies']
    require(type(gaps) is list and len(gaps) == 2, 'discrepancies', '保留两项已知间距差异')
    seen = []
    for gap in gaps:
        fields(gap, 'token designMd code decision', 'discrepancy')
        require(gap['token'] in ('spacing.sm', 'spacing.lg'), 'discrepancy.token', '未知差异')
        name = gap['token'].split('.')[1]
        exact(gap['code'], tokens['spacing'][name], 'discrepancy.code')
        exact(gap['designMd'], {'sm':'8px', 'lg':'24px'}[name], 'discrepancy.designMd')
        text(gap['decision'], 'discrepancy.decision')
        seen.append(gap['token'])
    unique(seen, 'discrepancies')
    components = fields(contract['components'], ' '.join(COMPONENTS), 'components')
    for name, item in components.items():
        fields(item, 'figmaName sourcePath', name)
        exact(item['figmaName'], name, f'{name}.figmaName')
        exact(item['sourcePath'], f'packages/ui/src/components/content/{name}.svelte', f'{name}.sourcePath')
    patterns = contract['patterns']
    require(type(patterns) is list and len(patterns) == 3, 'patterns', '需要三类页面模式')
    pattern_ids = []
    for page in patterns:
        fields(page, 'id name job components regions primaryActionOwner compositionSlots states', 'pattern')
        text(page['id'], 'pattern.id')
        require(page['id'] in STATES, 'pattern.id', '未知页面模式')
        pattern_ids.append(page['id'])
        for key in ('name', 'job'):
            text(page[key], f'pattern.{key}')
        names = unique(page['components'], 'pattern.components')
        require(set(names) == PATTERN_COMPONENTS[page['id']], 'pattern.components', '未知或缺失组件')
        regions = unique(page['regions'], 'regions')
        owner = 'actions' if page['id'] == 'settings-form' else 'header'
        exact(page['primaryActionOwner'], owner, 'primaryActionOwner')
        require(owner in regions, 'primaryActionOwner', '主操作没有归属区域')
        slots = page['compositionSlots']
        require(type(slots) is dict and bool(slots) and set(slots) <= set(regions), 'compositionSlots', '组合区必须引用已有区域')
        for content in slots.values():
            text(content, 'compositionSlot')
        states = page['states']
        require(type(states) is list, 'states', '需要状态列表')
        state_ids = []
        for state in states:
            fields(state, 'id label feedback recoveryAction dataVisibility acceptance', 'state')
            text(state['id'], 'state.id')
            state_ids.append(state['id'])
            for key in ('label', 'recoveryAction', 'acceptance'):
                text(state[key], f'state.{key}')
            feedback = fields(state['feedback'], 'owner mode clearWhen', 'feedback')
            require(isinstance(feedback['owner'], str) and feedback['owner'] in regions, 'feedback.owner', '反馈区域不存在')
            require(feedback['mode'] in ('none', 'inline', 'transient'), 'feedback.mode', '未知反馈模式')
            text(feedback['clearWhen'], 'feedback.clearWhen')
            require(state['dataVisibility'] in ('none', 'authorized', 'authorized-partial', 'draft'), 'dataVisibility', '未知可见性')
            if state['id'] == 'forbidden':
                exact(state['dataVisibility'], 'none', 'forbidden.dataVisibility')
            if page['id'] == 'settings-form' and state['id'] == 'success':
                exact(feedback['mode'], 'transient', 'success.feedback')
                exact(feedback['owner'], 'transient-feedback', 'success.owner')
        unique(state_ids, 'state ids')
        require(set(state_ids) == set(STATES[page['id']]), 'states', '缺少必须状态或包含未知状态')
    unique(pattern_ids, 'pattern ids')
    targets = fields(contract['acceptanceTargets'], 'themes viewports designReview applicationBrowserRegression accessibility', 'acceptanceTargets')
    exact(targets['themes'], ['light', 'dark'], 'themes')
    exact(targets['viewports'], [[1440, 900], [1920, 1080], [390, 844]], 'viewports')
    exact(targets['designReview'], 'pending', 'designReview')
    exact(targets['applicationBrowserRegression'], 'not-run', 'applicationBrowserRegression')
    text(targets['accessibility'], 'accessibility')
    if source_root is not None:
        validate_sources(contract, source_root)
    return {'metadataValid': True, 'sourceChecked': source_root is not None,
            'components': len(components), 'patterns': len(patterns), 'states': 18, 'tokenMappings': 15}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kit', type=Path, default=KIT)
    parser.add_argument('--source-root', type=Path, default=KIT.parents[1])
    parser.add_argument('--metadata-only', action='store_true', help='明确跳过源码映射检查，不算源码验证通过')
    args = parser.parse_args()
    try:
        result = validate_bundle(load_json(args.kit / 'manifest.json'), load_json(args.kit / 'contract.json'),
                                 None if args.metadata_only else args.source_root)
    except (ValidationError, OSError, UnicodeError) as exc:
        print(f'reference-kit: FAIL: {exc}', file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
