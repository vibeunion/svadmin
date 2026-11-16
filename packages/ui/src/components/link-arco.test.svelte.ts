import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import LinkHarness from "../../test/fixtures/LinkHarness.svelte";

describe("Link Arco Enhancements", () => {
  it("renders external link icon when icon is true", () => {
    const { container } = render(LinkHarness, {
      props: {
        href: "https://arco.design",
        icon: true,
      },
    });

    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("https://arco.design");
    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
  });
});
