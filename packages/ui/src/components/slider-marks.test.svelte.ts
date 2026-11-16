import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import Slider from "./Slider.svelte";
import RangeSlider from "./RangeSlider.svelte";

describe("Slider and RangeSlider Marks Support", () => {
  it("renders mark labels and handles click to jump value in Slider", async () => {
    const onchange = vi.fn();
    const marks = { 0: "0°C", 50: "50°C", 100: "100°C" };
    const { container, getByText } = render(Slider, {
      props: {
        value: 10,
        min: 0,
        max: 100,
        marks,
        onchange,
      },
    });

    const marksContainer = container.querySelector('[data-slot="slider-marks"]');
    expect(marksContainer).not.toBeNull();
    expect(container.textContent).toContain("0°C");
    expect(container.textContent).toContain("50°C");
    expect(container.textContent).toContain("100°C");

    const mark50 = getByText("50°C");
    await fireEvent.click(mark50);
    expect(onchange).toHaveBeenCalledWith(50);
  });

  it("renders mark labels in RangeSlider", () => {
    const marks = { 0: "Min", 100: "Max" };
    const { container } = render(RangeSlider, {
      props: {
        value: { min: 20, max: 80 },
        min: 0,
        max: 100,
        marks,
      },
    });

    const marksContainer = container.querySelector('[data-slot="slider-marks"]');
    expect(marksContainer).not.toBeNull();
    expect(container.textContent).toContain("Min");
    expect(container.textContent).toContain("Max");
  });
});
