import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditNoTailwind } from './no-tailwind-contract.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const paths = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const violations = auditNoTailwind(root, paths);
if (violations.length) {
  console.error(`No-Tailwind contract failed (${violations.length}):\n${violations.map(value => `- ${value}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.info('No Tailwind compiler, styling helper, transitive lock entry, source CSS directive or shadcn-svelte generator configuration remains.');
}
