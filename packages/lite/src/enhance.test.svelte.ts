import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('optional lite enhancement', () => {
  it('closes a fragment confirmation when the user clicks outside it', () => {
    document.body.innerHTML = `
      <span id="lite-delete-posts-7-closed"></span>
      <span id="lite-delete-posts-7" class="lite-confirm-target">
        <button type="button">Inside</button>
      </span>
      <button type="button" id="outside">Outside</button>
    `;
    window.location.hash = '#lite-delete-posts-7';

    const script = readFileSync(resolve(process.cwd(), 'static/enhance.js'), 'utf8');
    window.eval(script);
    document.dispatchEvent(new Event('DOMContentLoaded'));
    document.querySelector<HTMLButtonElement>('#outside')?.click();

    expect(window.location.hash).toBe('#lite-delete-posts-7-closed');
  });

  it('adds uniquely indexed array rows and binds removal controls', () => {
    document.body.innerHTML = `
      <fieldset data-lite-array data-next-index="1">
        <div data-lite-array-item>
          <input name="contacts[0][name]" value="Alice">
          <button type="button" data-lite-array-remove hidden>Remove</button>
        </div>
        <button type="button" data-lite-array-add hidden>Add</button>
        <template data-lite-array-template>
          <div data-lite-array-item>
            <input name="contacts[__INDEX__][name]">
            <button type="button" data-lite-array-remove hidden>Remove</button>
          </div>
        </template>
      </fieldset>
    `;

    const script = readFileSync(resolve(process.cwd(), 'static/enhance.js'), 'utf8');
    window.eval(script);
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const addButton = document.querySelector<HTMLButtonElement>('[data-lite-array-add]');
    expect(addButton?.hidden).toBe(false);
    addButton?.click();

    const items = document.querySelectorAll('[data-lite-array-item]');
    expect(items).toHaveLength(2);
    expect(document.querySelector('[name="contacts[1][name]"]')).toBeTruthy();

    const removeButton = items[1]?.querySelector<HTMLButtonElement>('[data-lite-array-remove]');
    expect(removeButton?.hidden).toBe(false);
    removeButton?.click();
    expect(document.querySelectorAll('[data-lite-array-item]')).toHaveLength(1);
  });
});
