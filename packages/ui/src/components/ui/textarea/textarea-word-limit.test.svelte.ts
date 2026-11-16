import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import TextareaWordLimitHarness from "../../../../test/fixtures/TextareaWordLimitHarness.svelte";

describe("Textarea Word Limit and Clear Enhancements", () => {
  it("renders character count limit and allows clearing text", async () => {
    const { container } = render(TextareaWordLimitHarness, {
      props: {
        value: "Hello world",
        maxLength: 50,
        showWordLimit: true,
        allowClear: true,
      },
    });

    const wrapper = container.querySelector('[data-slot="textarea-wrapper"]');
    expect(wrapper).not.toBeNull();

    const limitEl = container.querySelector('[data-slot="textarea-word-limit"]');
    expect(limitEl).not.toBeNull();
    expect(limitEl?.textContent?.trim()).toBe("11 / 50");

    const textarea = container.querySelector("textarea");
    expect(textarea?.value).toBe("Hello world");

    const clearBtn = container.querySelector(".svadmin-textarea-clear");
    expect(clearBtn).not.toBeNull();

    if (clearBtn) {
      await fireEvent.click(clearBtn);
      expect(textarea?.value).toBe("");
    }
  });
});
