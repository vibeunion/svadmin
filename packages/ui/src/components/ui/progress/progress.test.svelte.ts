import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import Progress from "./progress.svelte";

describe("Progress states", () => {
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

  it("supports Arco Design percent, type, and showText aliases", () => {
    const { container } = render(Progress, {
      props: {
        percent: 75,
        type: "circle",
        showText: true,
        status: "normal",
      },
    });

    const circle = container.querySelector(".svadmin-progress--circle");
    expect(circle).not.toBeNull();
    expect(circle?.getAttribute("aria-valuenow")).toBe("75");
    expect(container.querySelector(".svadmin-progress__info")?.textContent).toBe("75%");
  });

  it("supports steps option rendering discrete step items", () => {
    const { container } = render(Progress, {
      props: {
        percent: 60,
        steps: 5,
      },
    });

    const stepItems = container.querySelectorAll(".svadmin-progress-step-item");
    expect(stepItems.length).toBe(5);

    const activeStepItems = container.querySelectorAll(".svadmin-progress-step-item--active");
    expect(activeStepItems.length).toBe(3);
  });
});
