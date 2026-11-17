import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import Result from "./Result.svelte";
import ColorPicker from "./ColorPicker.svelte";

describe("Result extra/subTitle and ColorPicker size/showText enhancements", () => {
  it("renders Result with subTitle alias and extra action slot", () => {
    const extraSnippet = createRawSnippet(() => ({
      render: () => '<button type="button" data-testid="back-btn">Back Home</button>',
    }));

    const { getByText, getByTestId, container } = render(Result, {
      props: {
        status: "success",
        title: "Order Placed",
        subTitle: "Your order has been processed successfully",
        extra: extraSnippet,
      },
    });

    expect(getByText("Order Placed")).toBeTruthy();
    expect(getByText("Your order has been processed successfully")).toBeTruthy();
    expect(getByTestId("back-btn")).toBeTruthy();
    expect(container.querySelector('[data-slot="result-extra"]')).not.toBeNull();
  });

  it("renders ColorPicker with size attribute and hex text preview", () => {
    const { container, getByText } = render(ColorPicker, {
      props: {
        value: "#165dff",
        size: "small",
        showText: true,
      },
    });

    const picker = container.querySelector(".svadmin-color-picker");
    expect(picker?.getAttribute("data-size")).toBe("small");
    expect(getByText(/#165dff/i)).toBeTruthy();
  });
});
