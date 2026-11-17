import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import Alert from "./alert.svelte";
import Switch from "../switch/switch.svelte";

describe("Alert content and close text", () => {
	it("renders content and title props", () => {
		const { container } = render(Alert, {
			props: {
				title: "提醒标题",
				content: "这是详细提示内容，支持正文说明",
			},
		});
		expect(container.querySelector('[data-slot="alert-title"]')?.textContent).toBe("提醒标题");
		expect(container.querySelector('[data-slot="alert-description"]')?.textContent).toBe("这是详细提示内容，支持正文说明");
	});

	it("renders custom closeText and handles onclose", async () => {
		const onclose = vi.fn();
		const { container } = render(Alert, {
			props: {
				content: "请确认该操作",
				closeText: "知道了",
				onclose,
			},
		});
		const closeBtn = container.querySelector(".svadmin-alert__close");
		expect(closeBtn?.textContent?.trim()).toBe("知道了");
		if (closeBtn) {
			await fireEvent.click(closeBtn);
			expect(onclose).toHaveBeenCalled();
		}
	});

	it("maps type='normal' to default variant", () => {
		const { container } = render(Alert, {
			props: {
				type: "normal",
				content: "普通提示",
			},
		});
		const root = container.querySelector('[data-slot="alert"]');
		expect(root?.getAttribute("data-variant")).toBe("default");
	});
});

describe("Switch size aliases and text", () => {
	it("renders size='small' when size='mini' or 'small'", () => {
		const { container, rerender } = render(Switch, {
			props: { size: "mini" },
		});
		const btn = container.querySelector("button");
		expect(btn?.getAttribute("data-size")).toBe("small");

		rerender({ size: "small" });
		expect(btn?.getAttribute("data-size")).toBe("small");

		rerender({ size: "default" });
		expect(btn?.getAttribute("data-size")).toBe("default");
	});
});
