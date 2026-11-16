import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import TagColorHarness from "../../test/fixtures/TagColorHarness.svelte";

describe("Tag Color and Icon Enhancements", () => {
  it("renders preset color and leading icon", () => {
    const { container } = render(TagColorHarness, {
      props: {
        color: "blue",
        bordered: true,
      },
    });

    const tag = container.querySelector('[data-slot="tag"]');
    expect(tag).not.toBeNull();
    expect(tag?.getAttribute("data-color")).toBe("blue");
    expect(tag?.classList.contains("text-primary")).toBe(true);

    const icon = container.querySelector(".svadmin-tag__icon");
    expect(icon).not.toBeNull();
  });
});
