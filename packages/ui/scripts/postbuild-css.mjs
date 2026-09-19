import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const distDir = new URL('../dist/', import.meta.url);
for (const name of ['app.css', 'app.theme.css']) {
	const path = fileURLToPath(new URL(name, distDir));
	const css = readFileSync(path, 'utf8');
	const root = postcss.parse(css);
	root.walkAtRules((rule) => {
		if (['import', 'theme', 'source', 'apply', 'utility'].includes(rule.name)) {
			throw new Error(`${name} contains a build-time-only CSS directive: @${rule.name}`);
		}
	});
	writeFileSync(path, `${root.toString().trim()}\n`, 'utf8');
}
console.info('[postbuild-css] verified standalone Panda CSS entries');
