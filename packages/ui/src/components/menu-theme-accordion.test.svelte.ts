import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import Menu, { type MenuEntry } from "./Menu.svelte";

describe("Menu theme and accordion enhancements", () => {
  const items: MenuEntry[] = [
    {
      id: "grp-1",
      label: "Group 1",
      children: [{ id: "sub-1", label: "Sub 1" }],
    },
    {
      id: "grp-2",
      label: "Group 2",
      children: [{ id: "sub-2", label: "Sub 2" }],
    },
  ];

  it("renders dark theme menu with data-theme attribute", () => {
    const { container } = render(Menu, {
      items,
      theme: "dark",
    });

    const nav = container.querySelector(".svadmin-menu");
    expect(nav?.getAttribute("data-theme")).toBe("dark");
    expect(nav?.classList.contains("svadmin-menu--dark")).toBe(true);
  });

  it("keeps only one group open in accordion mode", async () => {
    const onopenchange = vi.fn();
    const { getByRole } = render(Menu, {
      items,
      accordion: true,
      onopenchange,
    });

    const grp1 = getByRole("button", { name: /Group 1/ });
    const grp2 = getByRole("button", { name: /Group 2/ });

    await fireEvent.click(grp1);
    expect(onopenchange).toHaveBeenLastCalledWith(["grp-1"]);

    await fireEvent.click(grp2);
    expect(onopenchange).toHaveBeenLastCalledWith(["grp-2"]);
  });
});
