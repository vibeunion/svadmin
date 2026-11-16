import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import InputPrefixClearHarness from "../../../../test/fixtures/InputPrefixClearHarness.svelte";

describe("Input Prefix, Suffix, and Clear Enhancements", () => {
  it("renders prefix, suffix and allows clearing the input", async () => {
    const { container } = render(InputPrefixClearHarness, {
      props: {
        value: "Initial content",
        allowClear: true,
      },
    });

    const wrapper = container.querySelector('[data-slot="input-wrapper"]');
    expect(wrapper).not.toBeNull();

    expect(container.querySelector(".svadmin-input-prefix")?.textContent?.trim()).toBe("@");
    expect(container.querySelector(".svadmin-input-suffix")?.textContent?.trim()).toBe(".com");

    const input = container.querySelector("input");
    expect(input?.value).toBe("Initial content");

    const clearBtn = container.querySelector(".svadmin-input-clear");
    expect(clearBtn).not.toBeNull();

    if (clearBtn) {
      await fireEvent.click(clearBtn);
      expect(input?.value).toBe("");
    }
  });
});
