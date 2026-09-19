import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = join(packageRoot, 'src');
const cssPath = join(sourceRoot, 'app.css');
const distDir = join(packageRoot, 'dist');
const outputPath = join(distDir, 'app.css');
const themeOutputPath = join(distDir, 'app.theme.css');

function inlineLocalImports(path, stack = []) {
	const source = readFileSync(path, 'utf8');
	return source.replace(/@import\s+["'](\.[^"']+)["'];?/gu, (statement, relativePath) => {
		const importedPath = join(dirname(path), relativePath);
		if (stack.includes(importedPath)) {
			throw new Error(`Circular CSS import: ${[...stack, importedPath].join(' -> ')}`);
		}
		return inlineLocalImports(importedPath, [...stack, importedPath]);
	});
}

const compiledCss = postcss.parse(inlineLocalImports(cssPath)).toString();
mkdirSync(distDir, { recursive: true });
writeFileSync(outputPath, `${compiledCss.trim()}\n`, 'utf8');
writeFileSync(themeOutputPath, `${compiledCss.trim()}\n`, 'utf8');
console.info(`[build-static-css] bundled Panda and native CSS into ${outputPath}`);
