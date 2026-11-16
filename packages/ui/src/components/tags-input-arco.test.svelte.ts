import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import TagsInput from "./TagsInput.svelte";

describe("TagsInput Arco Enhancements", () => {
  it("collapses tags when maxTagCount is exceeded", () => {
    const { container } = render(TagsInput, {
      props: {
        value: ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"],
        maxTagCount: 2,
      },
    });

    const tags = container.querySelectorAll(".svadmin-tags-input__tag");
    // 2 visible tags + 1 overflow tag
    expect(tags).toHaveLength(3);
    const overflowTag = container.querySelector(".svadmin-tags-input__tag--overflow");
    expect(overflowTag).not.toBeNull();
    expect(overflowTag?.textContent).toContain("+3");
  });

  it("clears all tags when allowClear is enabled", async () => {
    const onchange = vi.fn();
    const { container } = render(TagsInput, {
      props: {
        value: ["Tag1", "Tag2"],
        allowClear: true,
        onchange,
      },
    });

    const clearBtn = container.querySelector(".svadmin-tags-input__clear");
    expect(clearBtn).not.toBeNull();

    if (clearBtn) {
      await fireEvent.click(clearBtn);
      expect(onchange).toHaveBeenCalledWith([]);
    }
  });
});
