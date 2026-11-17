import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import Collapse from "./Collapse.svelte";
import TabsContextHarness from "../../test/fixtures/TabsContextHarness.svelte";

describe("Collapse size and Tabs type/orientation enhancements", () => {
  it("renders Collapse with size attributes", () => {
    const content = createRawSnippet(() => ({ render: () => '<span>Body</span>' }));
    const { container } = render(Collapse, {
      props: {
        size: "small",
        items: [{ id: "1", title: "Section 1", content }],
      },
    });

    const el = container.querySelector(".svadmin-collapse");
    expect(el?.getAttribute("data-size")).toBe("small");
  });

  it("propagates type and orientation from Tabs root to TabsList", () => {
    const { container } = render(TabsContextHarness);

    const tabsRoot = container.querySelector('[data-slot="tabs"]');
    expect(tabsRoot?.getAttribute("data-variant")).toBe("card");
    expect(tabsRoot?.getAttribute("data-orientation")).toBe("vertical");

    const list = container.querySelector('[data-slot="tabs-list"]');
    expect(list?.getAttribute("data-variant")).toBe("card");
    expect(list?.getAttribute("data-orientation")).toBe("vertical");
    expect(list?.getAttribute("aria-orientation")).toBe("vertical");
  });
});
