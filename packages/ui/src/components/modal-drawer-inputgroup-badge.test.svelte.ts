import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import Badge from "./ui/badge/badge.svelte";
import InputGroup from "./InputGroup.svelte";
import ModalForm from "./ModalForm.svelte";
import DrawerForm from "./DrawerForm.svelte";

describe("InputGroup compact, Badge maxCount, and ModalForm/DrawerForm okText enhancements", () => {
  it("renders Badge with maxCount overflow truncation", () => {
    const { container } = render(Badge, {
      props: {
        count: 150,
        maxCount: 99,
      },
    });

    expect(container.textContent).toContain("99+");
  });

  it("renders InputGroup with compact attribute when compact=true", () => {
    const inputSnippet = createRawSnippet(() => ({
      render: () => '<input class="svadmin-input" />',
    }));

    const { container } = render(InputGroup, {
      props: {
        compact: true,
        addBefore: "https://",
        children: inputSnippet,
      },
    });

    const el = container.querySelector(".svadmin-input-group");
    expect(el?.getAttribute("data-compact")).toBe("true");
    expect(el?.getAttribute("data-size")).toBe("compact");
  });

  it("renders ModalForm and DrawerForm with custom okText", () => {
    const modalView = render(ModalForm, {
      open: true,
      title: "Confirm Action",
      okText: "立即提交",
    });
    expect(document.body.textContent).toContain("立即提交");
    modalView.unmount();

    const drawerView = render(DrawerForm, {
      open: true,
      title: "Edit Panel",
      okText: "保存配置",
    });
    expect(document.body.textContent).toContain("保存配置");
    drawerView.unmount();
  });
});
