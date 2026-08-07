import { describe, expect, it } from 'vitest';
import { buttonVariants } from './button.svelte';

describe('buttonVariants', () => {
	it('applies the default-variant hover state to real <button> elements, not only anchors', () => {
		const classes = buttonVariants({ variant: 'default' });

		// 组件默认渲染 <button>，hover 反馈不能只对 <a> 生效（badge 的 [a]: 模式不适用于 button）。
		expect(classes).toContain('hover:bg-primary/80');
		expect(classes).not.toContain('[a]:hover:bg-primary/80');
	});

	it('keeps anchor-only hover scoping out of every button variant', () => {
		for (const variant of ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const) {
			expect(buttonVariants({ variant })).not.toMatch(/\[a\]:/);
		}
	});
});
