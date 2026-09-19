#!/usr/bin/env python3
"""从参考契约确定性生成离线审阅页；不是 Svelte 运行时或 Figma 导出。"""
from __future__ import annotations

import argparse
import hashlib
import html
import sys
from pathlib import Path

from validate import KIT, ValidationError, load_json, validate_bundle

# 仅为审阅页的主题快照，来自 c9193633 的 components.css :root / .dark。
# 它不是生产主题权威来源，不改变组件，也不证明发布 CSS 的计算样式。
STYLE = '''
:root { color-scheme: light; --background:oklch(0.982 0.003 264); --foreground:oklch(0.205 0.012 264);
 --card:oklch(1 0 0); --muted-foreground:oklch(0.493 0.018 264); --border:oklch(0.914 0.006 264);
 --primary:oklch(0.558 0.22 278); --accent:oklch(0.962 0.012 278); }
@media(prefers-color-scheme:dark) { :root { color-scheme:dark; --background:oklch(0.15 0.01 264);
 --foreground:oklch(0.96 0.004 264); --card:oklch(0.185 0.012 264); --muted-foreground:oklch(0.7 0.012 264);
 --border:oklch(0.3 0.012 264); --primary:oklch(0.68 0.18 278); --accent:oklch(0.245 0.035 278); } }
* { box-sizing:border-box; }
html { scroll-behavior:auto; }
body { margin:0; color:var(--foreground); background:var(--background); font:var(--font-body)/1.6 Inter,ui-sans-serif,system-ui,sans-serif; }
a { color:var(--primary); text-underline-offset:3px; overflow-wrap:anywhere; }
a:focus-visible { outline:2px solid var(--primary); outline-offset:4px; border-radius:2px; }
header { border-bottom:1px solid var(--border); background:var(--card); }
.top { max-width:1280px; margin:auto; padding:var(--space-lg) 32px; display:flex; justify-content:space-between; gap:16px; align-items:center; }
.wordmark { font-weight:650; font-size:17px; letter-spacing:0; }
.tag,.muted { color:var(--muted-foreground); }
.tag { font-size:var(--font-compact); }
.layout { max-width:1280px; margin:auto; padding:32px; display:grid; grid-template-columns:196px minmax(0,1fr); gap:40px; }
nav { align-self:start; position:sticky; top:24px; }
nav h2 { font-size:var(--font-compact); font-weight:500; color:var(--muted-foreground); margin:0 0 12px; }
nav a { display:block; padding:8px 0; color:var(--foreground); text-decoration:none; }
nav a:hover { color:var(--primary); text-decoration:underline; }
main { min-width:0; }
h1 { font-size:28px; line-height:1.35; font-weight:600; margin:0 0 12px; }
h2 { font-size:20px; line-height:1.4; font-weight:600; margin:0 0 8px; }
h3 { font-size:15px; font-weight:600; margin:0 0 8px; }
p { margin:0 0 16px; }
.kicker { color:var(--primary); font-size:var(--font-compact); margin-bottom:8px; }
.lead { max-width:780px; color:var(--muted-foreground); }
.summary { display:flex; gap:32px; padding:20px 0 24px; border-bottom:1px solid var(--border); }
.summary strong { display:block; font-size:24px; font-variant-numeric:tabular-nums; }
.summary span { font-size:var(--font-compact); color:var(--muted-foreground); }
.notice { border-left:3px solid var(--primary); padding:12px 16px; margin:24px 0; background:var(--accent); }
.notice p:last-child { margin:0; }
section { padding:28px 0; border-bottom:1px solid var(--border); scroll-margin-top:20px; }
code { font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace; overflow-wrap:anywhere; }
.chips { display:flex; flex-wrap:wrap; gap:8px; margin:12px 0; }
.chips code { padding:3px 8px; border:1px solid var(--border); background:var(--card); border-radius:4px; }
.anatomy { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); border:1px solid var(--border); margin:16px 0 20px; background:var(--card); }
.anatomy div { padding:12px 16px; border-inline-end:1px solid var(--border); min-width:0; }
.anatomy div:last-child { border:0; }
.anatomy small { display:block; color:var(--muted-foreground); margin-top:4px; }
.state { display:grid; grid-template-columns:136px minmax(0,1fr); gap:16px; padding:20px 0; border-top:1px solid var(--border); }
.state .label { font-weight:600; }
.state .id { display:block; color:var(--muted-foreground); font-size:11px; margin-top:4px; }
.state p { margin:0 0 10px; }
.state dl { margin:0; display:grid; grid-template-columns:76px minmax(0,1fr); gap:6px 12px; }
.state dt { color:var(--muted-foreground); }
.state dd { margin:0; overflow-wrap:anywhere; }
.table-wrap { overflow:auto; }
table { width:100%; border-collapse:collapse; text-align:left; }
th,td { padding:10px 12px; border-bottom:1px solid var(--border); vertical-align:top; }
th { color:var(--muted-foreground); font-weight:500; }
.sources { display:grid; gap:16px; }
.sources article { border-bottom:1px solid var(--border); padding-bottom:16px; }
footer { padding:24px 0; color:var(--muted-foreground); font-size:var(--font-compact); overflow-wrap:anywhere; }
.skip { position:absolute; top:-100px; left:16px; background:var(--card); padding:12px; z-index:5; }
.skip:focus { top:12px; }
@media(max-width:760px) { .top { padding:16px 20px; align-items:flex-start; } .tag { max-width:140px; text-align:right; }
 .layout { display:block; padding:24px 20px; } nav { position:static; border-bottom:1px solid var(--border); margin-bottom:24px; padding-bottom:16px; }
 nav h2 { margin:0; } nav a { display:inline-block; margin-inline-end:16px; min-height:40px; }
 h1 { font-size:24px; } .summary { gap:24px; } .anatomy { grid-template-columns:1fr; }
 .anatomy div { border-inline-end:0; border-bottom:1px solid var(--border); }
 .state { grid-template-columns:1fr; gap:10px; } .state .id { display:inline; margin-left:8px; }
 .state dl { grid-template-columns:64px minmax(0,1fr); gap:6px 8px; } th,td { padding:10px 6px; } }
'''


def render(manifest: dict, contract: dict) -> str:
    result = validate_bundle(manifest, contract)
    esc = html.escape
    tokens = contract['tokens']
    numeric = ':root {' + ''.join(f'--space-{k}:{v};' for k, v in tokens['spacing'].items())
    numeric += ''.join(f'--font-{k}:{v};' for k, v in tokens['fontSizes'].items()) + '}'
    nav = ''.join(f'<a href="#{p["id"]}">{esc(p["name"])}</a>' for p in contract['patterns'])
    pages = []
    modes = {'none':'无额外反馈', 'inline':'就地反馈', 'transient':'短暂反馈'}
    data = {'none':'不展示记录', 'authorized':'仅已授权内容', 'authorized-partial':'仅已授权的已知部分', 'draft':'当前作用域草稿'}
    for number, page in enumerate(contract['patterns'], 1):
        chips = ''.join(f'<code>{esc(name)}</code>' for name in page['components'])
        states = []
        for state in page['states']:
            feedback = state['feedback']
            details = [
                ('反馈归属', f'{feedback["owner"]} · {modes[feedback["mode"]]}'),
                ('移除条件', feedback['clearWhen']),
                ('恢复路径', state['recoveryAction']),
                ('数据范围', data[state['dataVisibility']]),
            ]
            dl = ''.join(f'<dt>{esc(k)}</dt><dd>{esc(v)}</dd>' for k, v in details)
            states.append(f'<article class="state" id="{page["id"]}-{state["id"]}" data-state="{state["id"]}">'
                          f'<div><span class="label">{esc(state["label"])}</span><code class="id">{state["id"]}</code></div>'
                          f'<div><p>{esc(state["acceptance"])}</p><dl>{dl}</dl></div></article>')
        slots = '；'.join(page['compositionSlots'].values())
        pages.append(f'<section id="{page["id"]}" data-pattern="{page["id"]}"><p class="kicker">模式 {number:02d}</p>'
                     f'<h2>{esc(page["name"])}</h2><p class="muted">{esc(page["job"])}</p><div class="chips">{chips}</div>'
                     f'<div class="anatomy"><div>主操作归属<small>{esc(page["primaryActionOwner"])}</small></div>'
                     f'<div>区域结构<small>{esc(" → ".join(page["regions"]))}</small></div>'
                     f'<div>状态覆盖<small>{len(page["states"])} 项设计要求，尚未逐项应用验收</small></div></div>'
                     f'<p class="muted">{esc(slots)}</p>{"".join(states)}</section>')
    token_rows = ''.join(f'<tr><td><code>{category}.{key}</code></td><td><code>{esc(value)}</code></td></tr>'
                         for category, values in tokens.items() for key, value in values.items())
    gaps = ''.join(f'<p><code>{esc(g["token"])}</code>：DESIGN.md 为 {esc(g["designMd"])}，代码为 '
                   f'{esc(g["code"])}。{esc(g["decision"])}</p>' for g in contract['discrepancies'])
    refs = ''.join(f'<article><h3>{esc(ref["name"])}</h3><p>{esc(ref["role"])}</p>'
                   f'<p><a href="{esc(ref["documentationUrl"], quote=True)}">官方说明</a> · '
                   f'<a href="{esc(ref["communityUrl"], quote=True)}">Community 入口</a></p>'
                   '<p class="muted">图层未检查；文件级许可待审；未批准再分发。</p></article>' for ref in manifest['references'])
    return f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="color-scheme" content="light dark"><title>svadmin · Stripe-first 参考契约</title>
<style>{numeric}{STYLE}</style></head><body><a class="skip" href="#main">跳到主要内容</a>
<header><div class="top"><div class="wordmark">svadmin <span class="muted">/ 设计参考</span></div>
<div class="tag">Stripe-first · v0.1<br>基线 {contract['source']['commit'][:8]}</div></div></header>
<div class="layout"><nav aria-label="参考契约目录"><h2>页面模式</h2>{nav}<a href="#tokens">Token 映射</a><a href="#references">来源与边界</a></nav>
<main id="main"><p class="kicker">自有设计语言 · 参考资产入口</p><h1>明确任务，可信状态。</h1>
<p class="lead">把页面结构、组件名称、反馈归属和恢复路径放在同一份可审查契约中。沿用自己的 Svelte / Bits UI / Panda，不叠加第二套运行时。</p>
<div class="summary"><div><strong>{result['patterns']}</strong><span>页面模式</span></div><div><strong>{result['states']}</strong><span>设计状态</span></div><div><strong>{result['tokenMappings']}</strong><span>Token 映射</span></div></div>
<aside class="notice" aria-label="完成范围"><p><strong>这是离线契约审阅页，不是应用截图或已完成的 UI Kit。</strong></p>
<p>Figma 文件已创建，但图层写入因 Starter MCP 额度耗尽受阻；当前文件仍为空。状态要求不代表组件行为、无障碍或应用回归已经通过。</p></aside>
{''.join(pages)}
<section id="tokens"><h2>沿用代码中的尺度与语义</h2><p class="muted">权威入口：<code>{TOKEN_PATH_LABEL}</code>。rem 不预先固定根字号。</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Token</th><th scope="col">现有值或公开 CSS 变量</th></tr></thead><tbody>{token_rows}</tbody></table></div>
<div class="notice">{gaps}</div></section>
<section id="references"><h2>来源与许可边界</h2><div class="sources">{refs}</div>
<p><a href="{esc(manifest['figma']['url'], quote=True)}">打开已创建的 Figma 文件（目前为空）</a></p>
<p class="muted">本页只有原生 HTML / CSS；没有网络请求、脚本、业务提交、外部素材或供应商运行时代码。明暗配色为审阅快照，不替代发布样式或组件验收。</p></section>
<footer>元数据审阅日期：{manifest['reviewedOn']} · 源码基线：{contract['source']['commit']}<br>生成输入：manifest.json + contract.json；修改后重新运行 render_preview.py。</footer>
</main></div></body></html>
'''


TOKEN_PATH_LABEL = 'packages/ui/design/tokens.ts'


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kit', type=Path, default=KIT)
    parser.add_argument('--check', action='store_true', help='只检查产物是否与元数据一致')
    args = parser.parse_args()
    try:
        content = render(load_json(args.kit / 'manifest.json'), load_json(args.kit / 'contract.json')).encode()
        path = args.kit / 'preview.html'
        if args.check:
            if not path.exists() or path.read_bytes() != content:
                raise ValidationError('preview.html 已过期；请运行 render_preview.py')
        else:
            path.write_bytes(content)
    except (ValidationError, OSError, UnicodeError) as exc:
        print(f'reference-preview: FAIL: {exc}', file=sys.stderr)
        return 1
    print(f'preview.html sha256={hashlib.sha256(content).hexdigest()}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
