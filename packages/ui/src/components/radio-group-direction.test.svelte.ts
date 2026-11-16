import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import RadioGroup from "./RadioGroup.svelte";

describe("RadioGroup Direction Enhancements", () => {
  const options = [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
  ];

  it("renders horizontal options container when direction is horizontal", () => {
    const { container } = render(RadioGroup, {
      props: {
        options,
        direction: "horizontal",
        legend: "Choices",
      },
    });

    const optionsContainer = container.querySelector(".svadmin-radio-group__options");
    expect(optionsContainer).not.toBeNull();
    expect(optionsContainer?.getAttribute("data-direction")).toBe("horizontal");
    expect(optionsContainer?.classList.contains("flex")).toBe(true);
  });
});
