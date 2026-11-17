import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import Cascader, { type CascaderOption } from "./Cascader.svelte";
import TreeSelect, { type TreeSelectOption } from "./TreeSelect.svelte";

describe("Cascader and TreeSelect size options", () => {
  const cascaderOptions: CascaderOption[] = [
    { value: "zhejiang", label: "Zhejiang", children: [{ value: "hangzhou", label: "Hangzhou" }] },
  ];
  const treeOptions: TreeSelectOption[] = [
    { value: "dept-1", label: "Engineering" },
  ];

  it("renders Cascader with small size", () => {
    const { container } = render(Cascader, {
      options: cascaderOptions,
      size: "small",
    });

    const cascader = container.querySelector('[data-testid="cascader"]');
    expect(cascader?.getAttribute("data-size")).toBe("small");
  });

  it("renders TreeSelect with small size", () => {
    const { container } = render(TreeSelect, {
      options: treeOptions,
      size: "small",
    });

    const treeSelect = container.querySelector('[data-testid="tree-select"]');
    expect(treeSelect?.getAttribute("data-size")).toBe("small");
  });
});
