import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import Carousel from "./Carousel.svelte";
import CarouselHarness from "../../test/fixtures/CarouselHarness.svelte";

describe("Carousel Component", () => {
  it("renders slides and handles navigation", async () => {
    const onchange = vi.fn();
    const { container } = render(CarouselHarness, {
      props: {
        count: 3,
        onchange,
      },
    });

    const slides = container.querySelectorAll(".svadmin-carousel__slide");
    expect(slides).toHaveLength(3);

    const nextBtn = container.querySelector(".svadmin-carousel__next");
    expect(nextBtn).not.toBeNull();

    if (nextBtn) {
      await fireEvent.click(nextBtn);
      expect(onchange).toHaveBeenCalledWith(1);
    }
  });

  it("supports line indicator type", () => {
    const { container } = render(CarouselHarness, {
      props: {
        count: 3,
        indicatorType: "line",
      },
    });

    const dots = container.querySelector(".svadmin-carousel__dots--line");
    expect(dots).not.toBeNull();
  });
});
