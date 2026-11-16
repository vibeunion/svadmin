import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import Progress from "./progress.svelte";

describe("Progress Arco Enhancements", () => {
  it("renders status success with check icon in info slot", () => {
    const { container } = render(Progress, {
      props: {
        value: 100,
        status: "success",
        showInfo: true,
      },
    });

    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(container.querySelector(".text-success")).not.toBeNull();
  });

  it("renders status danger with cross icon in info slot", () => {
    const { container } = render(Progress, {
      props: {
        value: 50,
        status: "danger",
        showInfo: true,
      },
    });

    expect(container.querySelector(".text-destructive")).not.toBeNull();
  });
});
