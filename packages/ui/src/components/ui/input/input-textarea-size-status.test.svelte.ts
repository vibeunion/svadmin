import { describe, expect, it } from "vitest";
import { render } from "@testing-library/svelte";
import Input from "./input.svelte";
import Textarea from "../textarea/textarea.svelte";

describe("Input size and warning status", () => {
	it("normalizes size='small' to compact and size='large' to lg", () => {
		const { container, rerender } = render(Input, {
			props: { size: "small" },
		});
		const input = container.querySelector("input");
		expect(input?.getAttribute("data-size")).toBe("compact");

		rerender({ size: "large" });
		expect(input?.getAttribute("data-size")).toBe("lg");

		rerender({ size: "mini" });
		expect(input?.getAttribute("data-size")).toBe("mini");
	});

	it("sets data-input-state='warning' when status='warning'", () => {
		const { container } = render(Input, {
			props: { status: "warning" },
		});
		const input = container.querySelector("input");
		expect(input?.getAttribute("data-input-state")).toBe("warning");
	});
});

describe("Textarea size and warning status", () => {
	it("supports size normalization and warning status on Textarea", () => {
		const { container, rerender } = render(Textarea, {
			props: { size: "small", status: "warning" },
		});
		const textarea = container.querySelector("textarea");
		expect(textarea?.getAttribute("data-size")).toBe("compact");
		expect(textarea?.getAttribute("data-input-state")).toBe("warning");

		rerender({ size: "large", status: "normal" });
		expect(textarea?.getAttribute("data-size")).toBe("lg");
	});
});
