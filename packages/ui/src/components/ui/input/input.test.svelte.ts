import { fireEvent, render, screen } from "@testing-library/svelte";
import type { ComponentProps } from "svelte";
import { describe, expect, expectTypeOf, it } from "vitest";
import InputHarness from "../../../../test/fixtures/InputHarness.svelte";
import Input from "./input.svelte";

describe("Input", () => {
	it("preserves a custom data-slot without exposing migration aliases as props", () => {
		const { container } = render(Input, { "data-slot": "search-input" });
		const input = container.querySelector("input");
		expect(input?.getAttribute("data-slot")).toBe("search-input");
		expect(input?.classList.contains("svadmin-input")).toBe(true);
	});

	it("binds uploaded and cleared files without writing the protected value property", async () => {
		render(InputHarness, { props: { multiple: true } });

		const input = screen.getByLabelText<HTMLInputElement>("Attachment");
		const firstFile = new File(["first"], "first.txt", { type: "text/plain" });
		const secondFile = new File(["second"], "second.txt", { type: "text/plain" });
		const uploadedFiles = new DataTransfer();
		uploadedFiles.items.add(firstFile);
		uploadedFiles.items.add(secondFile);

		await fireEvent.change(input, { target: { files: uploadedFiles.files } });
		expect(screen.getByTestId("bound-files").textContent).toBe("first.txt,second.txt");

		await fireEvent.change(input, { target: { files: new DataTransfer().files } });
		expect(screen.getByTestId("bound-files").textContent).toBe("");
	});

	it("treats dynamically supplied input types case-insensitively", () => {
		expect(() => {
			render(Input, {
				type: "FILE",
				value: "must-not-be-written",
				files: new DataTransfer().files,
				"aria-label": "Dynamic attachment",
			} as never);
		}).not.toThrow();

		const input = screen.getByLabelText<HTMLInputElement>("Dynamic attachment");
		expect(input.type).toBe("file");
		expect(input.value).toBe("");
	});

	it("applies file selector button styling for file inputs", () => {
		render(Input, { type: "file", "aria-label": "File input" });
		const input = screen.getByLabelText<HTMLInputElement>("File input");
		expect(input.className).toContain("svadmin-input");
		expect(input.getAttribute("data-input-type")).toBe("file");
	});

	it("renders file picker copy from the active application locale", () => {
		render(InputHarness, { props: { mode: "file", locale: "zh-CN", label: "文件" } });

		expect(screen.getByText("选择文件")).toBeTruthy();
		expect(screen.getByText("未选择文件")).toBeTruthy();
	});

	it("renders a translated count for multiple selected files", async () => {
		render(InputHarness, { props: { multiple: true, locale: "en" } });

		const input = screen.getByLabelText<HTMLInputElement>("Attachment");
		const files = new DataTransfer();
		files.items.add(new File(["first"], "first.txt"));
		files.items.add(new File(["second"], "second.txt"));

		await fireEvent.change(input, { target: { files: files.files } });
		expect(screen.getByText("2 files selected")).toBeTruthy();
	});

	it("passes the active application locale to date inputs", () => {
		render(InputHarness, { props: { mode: "date", locale: "zh-CN", label: "日期" } });

		expect(screen.getByLabelText<HTMLInputElement>("日期").lang).toBe("zh-CN");
	});

	it("keeps value binding for non-file inputs", async () => {
		render(InputHarness, { props: { mode: "text" } });

		const input = screen.getByLabelText<HTMLInputElement>("Text value");
		expect(input.value).toBe("initial");
		await fireEvent.input(input, { target: { value: "updated" } });
		expect(screen.getByTestId("bound-value").textContent).toBe("updated");
	});

	it("keeps file values out of the public prop contract", () => {
		type FileInputProps = ComponentProps<typeof Input<"file">>;
		type TextInputProps = ComponentProps<typeof Input<"text">>;
		type NumberInputProps = ComponentProps<typeof Input<"number">>;
		expectTypeOf<{ type: "file"; value: string }>().not.toExtend<FileInputProps>();
		expectTypeOf<{ type: "text"; value: string }>().toExtend<TextInputProps>();
		expectTypeOf<{ type: "text"; value: { invalid: true } }>().not.toExtend<TextInputProps>();
		expectTypeOf<{ type: "number"; value: string }>().not.toExtend<NumberInputProps>();
		expectTypeOf<{ type: "number"; value: number | null }>().toExtend<NumberInputProps>();
	});

	it("binds numeric input and models an empty field as null", async () => {
		render(InputHarness, { mode: "number" });
		const input = screen.getByLabelText<HTMLInputElement>("Numeric value");
		await fireEvent.input(input, { target: { value: "73" } });
		expect(screen.getByTestId("bound-number").textContent).toBe("73");
		await fireEvent.input(input, { target: { value: "" } });
		expect(screen.getByTestId("bound-number").textContent).toBe("empty");
	});

	it("keeps native and visual disabled states aligned when toggled", async () => {
		const { rerender } = render(Input, { type: "file", disabled: true, "aria-label": "Disabled attachment" });
		const input = screen.getByLabelText<HTMLInputElement>("Disabled attachment");
		expect(input.disabled).toBe(true);
		expect(input.closest(".svadmin-file-input")?.getAttribute("data-disabled")).toBe("true");
		await rerender({ type: "file", disabled: false, "aria-label": "Disabled attachment" });
		expect(input.disabled).toBe(false);
		expect(input.closest(".svadmin-file-input")?.getAttribute("data-disabled")).toBeNull();
	});

	it("renders a single filename and restores the empty label after clearing", async () => {
		render(InputHarness, { props: { locale: "en" } });
		const input = screen.getByLabelText<HTMLInputElement>("Attachment");
		expect(screen.getByText("No file chosen")).toBeTruthy();
		const files = new DataTransfer();
		files.items.add(new File(["report"], "report.csv"));
		await fireEvent.change(input, { target: { files: files.files } });
		expect(screen.getByText("report.csv", { selector: ".svadmin-file-input__name" })).toBeTruthy();
		await fireEvent.change(input, { target: { files: new DataTransfer().files } });
		expect(screen.getByText("No file chosen")).toBeTruthy();
		expect(screen.getByTestId("bound-files").textContent).toBe("");
	});
});
