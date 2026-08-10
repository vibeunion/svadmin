import { fireEvent, render, screen } from "@testing-library/svelte";
import type { ComponentProps } from "svelte";
import { describe, expect, expectTypeOf, it } from "vitest";
import Input from "./input.svelte";

describe("Input", () => {
	it("renders a file input without binding its protected value property", async () => {
		expect(() => {
			render(Input, { type: "file", "aria-label": "Attachment" });
		}).not.toThrow();

		const input = screen.getByLabelText<HTMLInputElement>("Attachment");
		expect(input.type).toBe("file");
		const file = new File(["evidence"], "evidence.txt", { type: "text/plain" });
		await fireEvent.change(input, { target: { files: [file] } });
		expect(input.files?.[0]).toBe(file);
	});

	it("keeps file values out of the public prop contract", () => {
		type FileInputProps = ComponentProps<typeof Input<"file">>;
		type TextInputProps = ComponentProps<typeof Input<"text">>;
		expectTypeOf<{ type: "file"; value: string }>().not.toExtend<FileInputProps>();
		expectTypeOf<{ type: "text"; value: string }>().toExtend<TextInputProps>();
	});
});
