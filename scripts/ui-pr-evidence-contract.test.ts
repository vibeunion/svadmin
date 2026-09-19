import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const job = workflow.split('  ui-pr-evidence:')[1]?.split('\n  publish:')[0];
const script = job?.split('          script: |\n')[1]?.split('\n').map(line => line.replace(/^ {12}/, '')).join('\n');
if (!script) throw new Error('Missing UI PR evidence script');

const head = 'current-renderer-commit';
const completeBody = `## State matrix
1440x900 and 1920x1080
- [x] git diff --check
![1440x900](https://example.test/1440.png)
![1920x1080](https://example.test/1920.png)`;

async function check(body: string, sha = head, files = ['example/src/App.svelte']) {
  const failures: string[] = [];
  const reads: unknown[] = [];
  // 只执行仓库自身的固定工作流脚本；网络接口均由本地桩替代。
  await runInNewContext(`(async () => {${script}\n})()`, {
    context: { repo: { owner: 'vibeunion', repo: 'svadmin' }, issue: { number: 432 },
      payload: { pull_request: { head: { sha: head }, body: '' } } },
    github: {
      paginate: async () => files.map(filename => ({ filename })),
      rest: { pulls: {
        listFiles: () => {},
        get: async (request: unknown) => { reads.push(request); return { data: { head: { sha }, body } }; },
      } },
    },
    core: { setFailed: (message: string) => failures.push(message) },
  });
  return { failures, reads };
}

describe('UI PR evidence reruns', () => {
  it('uses newly attached evidence on the same commit instead of the empty event body', async () => {
    const result = await check(completeBody);
    expect(result.failures).toEqual([]);
    expect(result.reads).toEqual([{ owner: 'vibeunion', repo: 'svadmin', pull_number: 432 }]);
  });

  it('does not allow an older run to accept evidence from a different head', async () => {
    expect((await check(completeBody, 'another-commit')).failures).toEqual([
      'PR head changed; run the evidence check on the current commit.',
    ]);
  });

  it('still rejects missing state, viewport, diff, and image evidence', async () => {
    const result = await check('');
    expect(result.failures).toHaveLength(1);
    for (const requirement of ['state matrix', '1440x900 evidence', '1920x1080 evidence',
      'completed diff check', 'two distinct screenshot attachments']) expect(result.failures[0]).toContain(requirement);
  });

  it('still requires two different screenshot attachments', async () => {
    const result = await check(completeBody.replace('https://example.test/1920.png', 'https://example.test/1440.png'));
    expect(result.failures).toEqual(['UI PR evidence is incomplete: two distinct screenshot attachments']);
  });

  it('does not require screenshots for a non-UI change', async () => {
    expect(await check('', head, ['README.md'])).toEqual({ failures: [], reads: [] });
  });
});
