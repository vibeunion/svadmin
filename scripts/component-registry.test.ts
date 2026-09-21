import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createComponentRegistryManifest } from "../packages/ui/src/component-registry";
import { allRecipes, describeRecipe } from "../packages/ui/src/recipes";

test("authoring registry is serializable and references real components and recipes", () => {
  const manifest = createComponentRegistryManifest();
  expect(JSON.parse(JSON.stringify(manifest))).toEqual(manifest);
  expect(manifest.purpose).toBe("authoring-only");
  expect(new Set(manifest.components.map(entry => entry.id)).size).toBe(manifest.components.length);
  for (const entry of manifest.components) {
    expect(existsSync(resolve(import.meta.dir, "../packages/ui/src",
      entry.component.replace("@svadmin/ui/", "")))).toBe(true);
    expect(entry.recipeMetadata).toEqual(describeRecipe(entry.recipe));
    for (const value of Object.values(allRecipes[entry.recipe]())) expect(typeof value).toBe("string");
  }
  expect(describeRecipe("textareaRecipe").variants).toEqual({});
  expect(describeRecipe("productWorkspaceRecipe").defaults.hasSecondary).toBe(false);
});
