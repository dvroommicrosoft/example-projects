import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  captureItemFocus,
  createKeyboardHandler,
  restoreItemFocus,
} from "../public/keyboard.js";

function fixture(ids = ["a", "b", "c"]) {
  const document = { activeElement: null };
  function element() {
    return {
      focus() { document.activeElement = this; },
      closest() { return null; },
      matches() { return false; },
    };
  }
  const list = { ownerDocument: document, children: [] };
  list.children = ids.map((id) => {
    const row = { ...element(), dataset: { id } };
    const controls = new Map(
      [".item-toggle", ".item-priority", ".item-remove"].map((selector) => [
        selector,
        { ...element(), closest: () => row, matches: (value) => value === selector },
      ]),
    );
    row.closest = (selector) => selector === ".item" ? row : null;
    row.querySelector = (selector) => controls.get(selector);
    return row;
  });
  const search = element();
  const input = element();
  const summary = element();
  const help = { open: false, querySelector: () => summary };
  const enabled = { checked: true };
  const toggled = [];
  const handler = createKeyboardHandler({
    list, search, input, help, enabled, toggle: (id) => toggled.push(id),
  });
  function key(key, overrides = {}) {
    const event = {
      key,
      target: document.activeElement,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      ...overrides,
    };
    handler(event);
    return event;
  }
  return { document, list, search, input, summary, help, enabled, toggled, key };
}

describe("keyboard shortcuts", () => {
  test("search, new-item entry and help focus their targets", () => {
    const f = fixture();
    assert.equal(f.key("/").defaultPrevented, true);
    assert.equal(f.document.activeElement, f.search);
    f.document.activeElement = null;
    f.key("n");
    assert.equal(f.document.activeElement, f.input);
    f.document.activeElement = null;
    f.key("?", { shiftKey: true });
    assert.equal(f.help.open, true);
    assert.equal(f.document.activeElement, f.summary);
  });

  test("navigation follows visible order, enters at either end, and does not wrap", () => {
    const f = fixture(["filtered-3", "filtered-1"]);
    f.key("j");
    assert.equal(f.document.activeElement, f.list.children[0]);
    assert.equal(f.key("k").defaultPrevented, false);
    f.key("j");
    assert.equal(f.document.activeElement, f.list.children[1]);
    assert.equal(f.key("j").defaultPrevented, false);
    f.document.activeElement = null;
    f.key("k");
    assert.equal(f.document.activeElement, f.list.children[1]);
  });

  test("completion only operates on the currently focused row", () => {
    const f = fixture();
    assert.equal(f.key("x").defaultPrevented, false);
    f.list.children[1].focus();
    assert.equal(f.key("x").defaultPrevented, true);
    assert.deepEqual(f.toggled, ["b"]);
    f.search.focus();
    f.key("x");
    assert.deepEqual(f.toggled, ["b"]);
  });

  for (const flag of [
    "ctrlKey", "metaKey", "altKey", "shiftKey", "isComposing", "repeat", "defaultPrevented",
  ]) {
    test(`ignores ${flag} without moving focus`, () => {
      const f = fixture();
      const target = f.document.activeElement;
      f.key("n", { [flag]: true });
      assert.equal(f.document.activeElement, target);
    });
  }

  test("ignores composition's legacy keyCode and editable ancestors", () => {
    const f = fixture();
    assert.equal(f.key("n", { keyCode: 229 }).defaultPrevented, false);
    const target = { isContentEditable: true };
    assert.equal(f.key("n", { target }).defaultPrevented, false);
    for (const tag of ["input", "textarea", "select", "button", "summary", "a"]) {
      const control = { closest: (selector) => selector.split(", ").includes(tag) ? {} : null };
      assert.equal(f.key("n", { target: control }).defaultPrevented, false, tag);
    }
  });

  test("disabled shortcuts, unknown keys and empty navigation leave defaults intact", () => {
    const f = fixture([]);
    for (const key of ["j", "k", "x", "Delete", "Enter"]) {
      assert.equal(f.key(key).defaultPrevented, false);
    }
    f.enabled.checked = false;
    for (const key of ["/", "n", "?"]) {
      assert.equal(f.key(key).defaultPrevented, false);
    }
    assert.equal(f.help.open, false);
  });
});

describe("item focus restoration", () => {
  test("preserves the row and each specific control through replacement", () => {
    for (const selector of [null, ".item-toggle", ".item-priority", ".item-remove"]) {
      const before = fixture();
      const row = before.list.children[1];
      const focus = captureItemFocus(before.list, selector ? row.querySelector(selector) : row);
      const after = fixture();
      restoreItemFocus(after.list, focus, after.search);
      const nextRow = after.list.children[1];
      assert.equal(after.document.activeElement, selector ? nextRow.querySelector(selector) : nextRow);
    }
  });

  test("moves to the next row, the preceding last row, or search when a row disappears", () => {
    for (const [removedIndex, remaining, expected] of [
      [1, ["a", "c"], "c"],
      [2, ["a", "b"], "b"],
      [0, [], undefined],
    ]) {
      const before = fixture();
      const focus = captureItemFocus(before.list, before.list.children[removedIndex]);
      const after = fixture(remaining);
      restoreItemFocus(after.list, focus, after.search);
      assert.equal(
        after.document.activeElement,
        expected ? after.list.children.find((row) => row.dataset.id === expected) : after.search,
      );
    }
  });

  test("keeps focus outside the list untouched", () => {
    const f = fixture();
    f.search.focus();
    const focus = captureItemFocus(f.list, f.document.activeElement);
    assert.equal(focus, null);
    restoreItemFocus(f.list, focus, f.input);
    assert.equal(f.document.activeElement, f.search);
  });
});
