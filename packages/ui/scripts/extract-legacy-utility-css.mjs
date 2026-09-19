import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = fileURLToPath(new URL('../dist/app.css', import.meta.url));
const outputPath = fileURLToPath(new URL('../src/legacy-utility.css', import.meta.url));

const utilityPrefixes = [
	'absolute', 'animate-', 'aspect-', 'backdrop-', 'bg-', 'block', 'border', 'bottom-', 'break-',
	'col-', 'cursor-', 'divide-', 'duration-', 'ease-', 'fill-', 'fixed', 'flex', 'float-', 'font-', 'from-',
	'gap-', 'grid', 'grow', 'h-', 'hidden', 'inline', 'inset-', 'isolate', 'items-', 'justify-',
	'leading-', 'left-', 'line-clamp-', 'list-', 'm-', 'max-', 'mb-', 'me-', 'min-', 'mix-', 'ml-',
	'mr-', 'ms-', 'mt-', 'mx-', 'my-', 'object-', 'opacity-', 'order-', 'origin-', 'outline-', 'overflow-',
	'p-', 'pb-', 'pe-', 'pl-', 'placeholder-', 'pointer-events-', 'pr-', 'pt-', 'px-', 'py-', 'relative',
	'resize-', 'right-', 'ring-', 'rounded', 'rotate-', 'row-', 'scale-', 'select-', 'self-', 'shadow',
	'shrink', 'size-', 'skew-', 'space-', 'sr-only', 'start-', 'static', 'sticky', 'stroke-', 'table-',
	'tabular-nums', 'text-', 'to-', 'top-', 'tracking-', 'transform', 'transition', 'translate-', 'truncate', 'underline',
	'via-', 'visible', 'w-', 'whitespace-', 'will-change-', 'z-',
];

const utilityVariants = [
	'active:', 'aria-', 'before:', 'checked:', 'data-', 'dark:', 'disabled:', 'first:', 'focus-', 'focus:',
	'group-', 'hover:', 'last:', 'lg:', 'md:', 'motion-', 'not-', 'open:', 'print:', 'sm:', 'xl:', '2xl:',
];

const isUtilityClass = (name) => {
	const base = name.replace(/^!?-/, '').split(':').pop() ?? '';
	return name.startsWith('svadmin-u-')
		|| utilityPrefixes.some((prefix) => base === prefix || base.startsWith(prefix))
		|| utilityVariants.some((prefix) => name.startsWith(prefix));
};

const selectorContainsUtility = (selector) => {
	let found = false;
	selectorParser((selectors) => selectors.walkClasses((node) => {
		if (isUtilityClass(node.value)) found = true;
	})).processSync(selector);
	return found;
};

const source = postcss.parse(readFileSync(sourcePath, 'utf8'));

function extractContainer(container) {
	const nodes = [];
	for (const node of container.nodes ?? []) {
		if (node.type === 'rule') {
			if (selectorContainsUtility(node.selector)) nodes.push(node.clone());
			continue;
		}
		if (node.type === 'atrule' && (node.name === 'keyframes' || node.name === '-webkit-keyframes')) {
			nodes.push(node.clone());
			continue;
		}
		if (node.type !== 'atrule' || !node.nodes) continue;
		const children = extractContainer(node);
		if (children.length > 0) {
			const wrapper = node.clone({ nodes: [] });
			wrapper.append(children);
			nodes.push(wrapper);
		}
	}
	return nodes;
}

const output = postcss.root();
output.append(postcss.comment({ text: 'Generated from the last Tailwind-compatible release; runtime/build ownership is Panda CSS.' }));
output.append(extractContainer(source));
writeFileSync(outputPath, `${output.toString().trim()}\n`, 'utf8');
console.info(`[extract-legacy-utility-css] wrote ${outputPath}`);
