import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import RadioGroup from "./RadioGroup.svelte";

describe("RadioGroup Button Type & Size Enhancements", () => {
  const options = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ];

  it("renders button group structure when type is button", () => {
    const { container } = render(RadioGroup, {
      props: {
        options,
        value: "week",
        type: "button",
        size: "small",
      },
    });

    const fieldset = container.querySelector("fieldset");
    expect(fieldset?.getAttribute("data-type")).toBe("button");
    expect(fieldset?.getAttribute("data-size")).toBe("small");

    const optionsContainer = container.querySelector(".svadmin-radio-group__options--button");
    expect(optionsContainer).not.toBeNull();
    expect(optionsContainer?.getAttribute("data-size")).toBe("small");

    const labels = container.querySelectorAll(".svadmin-radio-group__button-option");
    expect(labels.length).toBe(3);

    const checkedLabel = container.querySelector(".svadmin-radio-group__button-option--checked");
    expect(checkedLabel).not.toBeNull();
    expect(checkedLabel?.textContent).toContain("Week");
  });

  it("emits onchange and updates when clicked in button type", async () => {
    const onchange = vi.fn();
    const { container } = render(RadioGroup, {
      props: {
        options,
        value: "day",
        type: "button",
        onchange,
      },
    });

    const monthInput = container.querySelector('input[value="month"]');
    expect(monthInput).not.toBeNull();
    await fireEvent.click(monthInput as HTMLInputElement);
    expect(onchange).toHaveBeenCalledWith("month");
  });
});
