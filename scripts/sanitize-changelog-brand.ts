import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 归一化历史 CHANGELOG 里的上游品牌词。
 *
 * release-please 会从 git 历史重新生成变更条目，历史 PR 标题里的品牌词因此
 * 反复出现。发布工作流会在提交 release 产物前运行本脚本，把措辞改成中性说法，
 * 让 `check:brand` 继续作为硬门禁。
 */

// 显式措辞替换，保持句子含义与链接不变。
const REWRITES: ReadonlyArray<readonly [RegExp, string]> = [
  [/align Arco visual tokens and interaction contracts/gu, 'align shared visual tokens and interaction contracts'],
  [/align arco visual tokens and interaction contracts/gu, 'align shared visual tokens and interaction contracts'],
  [/finish remaining Arco control contracts/gu, 'finish remaining shared control contracts'],
  [/close leftover Arco visual contracts/gu, 'close leftover shared visual contracts'],
  [/align Arco ecosystem capabilities/gu, 'align reference ecosystem capabilities'],
  [/align arco ecosystem capabilities/gu, 'align reference ecosystem capabilities'],
  [/with Arco patterns/gu, 'with shared reference patterns'],
  [/add Arco IP access rule editor and whitelist drawer/gu, 'add the IP access rule editor and whitelist drawer'],
  [/Arco Design ([Pp]ro)?/gu, 'reference design system '],
  [/Arco-like/gu, 'reference-style'],
  // 仅替换独立出现的品牌词，避免把 Barcode / charCodeAt 这类单词改坏。
  [/(?<![A-Za-z])Arco(?![A-Za-z])/gu, 'reference'],
  [/(?<![A-Za-z])arco(?![A-Za-z])/gu, 'reference'],
];

const packagesDir = join(import.meta.dir, '..', 'packages');

let changed = 0;
for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const path = join(packagesDir, entry.name, 'CHANGELOG.md');
  let content: string;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    continue;
  }
  const sanitized = REWRITES.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), content);
  if (sanitized === content) continue;
  writeFileSync(path, sanitized);
  changed += 1;
  console.info(`normalized ${path}`);
}

console.info(changed === 0 ? 'changelogs already neutral' : `normalized ${changed} changelog(s)`);