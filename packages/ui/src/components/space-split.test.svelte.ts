import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import SpaceSplitHarness from "../../test/fixtures/SpaceSplitHarness.svelte";

describe("Space Split Enhancements", () => {
  it("renders space with split property support", () => {
    const { container } = render(SpaceSplitHarness);
    const space = container.querySelector(".svadmin-space");
    expect(space).not.toBeNull();
    expect(container.textContent).toContain("Item 1");
    expect(container.textContent).toContain("Item 2");
    const separators = space?.querySelectorAll(":scope > .svadmin-space__split") ?? [];
    expect(separators).toHaveLength(1);
    expect(separators[0]?.textContent).toBe("|");
    expect(space?.firstElementChild?.textContent).toBe("Item 1");
    expect(space?.lastElementChild?.textContent).toBe("Item 2");
  });
});
