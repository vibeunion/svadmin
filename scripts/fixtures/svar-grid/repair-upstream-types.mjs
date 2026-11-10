// @svar-ui/svelte-menu@2.6.2 ships a declaration that imports `Menu` from its
// own `Menu.svelte` and then declares `const Menu`, which TS reports as a
// duplicate local declaration. Remove only that self-import so svelte-check can
// still validate the rest of the real upstream types.
import { readFile, writeFile } from 'node:fs/promises';

const file = new URL(
  './node_modules/@svar-ui/svelte-menu/dist/components/Menu.svelte.d.ts',
  import.meta.url,
);
const source = await readFile(file, 'utf8');
const repaired = source.replace(/^import Menu from "\.\/Menu\.svelte";\n/m, '');
if (repaired === source) {
  console.info('svar-menu declaration has no self-import to repair');
} else {
  await writeFile(file, repaired);
  console.info('removed svar-menu declaration self-import');
}
