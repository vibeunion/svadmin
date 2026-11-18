import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/**
 * 仓库级品牌词守卫。
 *
 * 历史 PR 标题会经 release-please 重新写进 CHANGELOG，所以仅清理一次不够：
 * 这里对全部受版本控制的文本文件做扫描，命中即失败，避免禁用品牌词回流。
 */

// 允许的误报：普通英文单词里包含 arco/antd 子串（例如 barcode、charCodeAt）。
const ALLOWED_SUBSTRINGS = [
  'barcode',
  'Barcode',
  'charCodeAt',
  'charCount',
  'svarColumn',
  'SvarColumn',
  'getBarColor',
  'clearConversation',
  'onclearcompleted',
  'OmnibarCommandPalette',
  'sidebarCollapsed',
];

const TEXT_EXTENSIONS = /\.(?:ts|mts|cts|js|mjs|cjs|svelte|css|md|mdx|json|ya?ml|txt|html|tsx|jsx)$/u;

const forbidden = /\b(?:arco|antd)\b/iu;

// 守卫与清洗脚本必须写出禁用词才能生效，扫描时排除它们自身。
const SELF_PATHS = new Set([
  'scripts/check-brand-neutral.ts',
  'scripts/sanitize-changelog-brand.ts',
]);

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((file) => file.length > 0 && !SELF_PATHS.has(file) && TEXT_EXTENSIONS.test(file));

const violations: string[] = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (!forbidden.test(line)) return;
    const allowed = ALLOWED_SUBSTRINGS.some((substring) => line.includes(substring));
    if (allowed) return;
    violations.push(`${file}:${index + 1}: ${line.trim().slice(0, 160)}`);
  });
}

if (violations.length > 0) {
  console.error(`禁用品牌词命中 ${violations.length} 处：`);
  for (const violation of violations.slice(0, 40)) console.error(`  ${violation}`);
  process.exit(1);
}

console.info(`品牌词守卫通过：${files.length} 个受版本控制的文本文件未出现禁用词。`);