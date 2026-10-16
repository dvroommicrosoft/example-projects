const interactiveSelector =
  "input, textarea, select, button, a, summary, [role='textbox'], [role='combobox'], [contenteditable]:not([contenteditable='false'])";

export function createKeyboardHandler({ list, search, input, help, enabled, toggle }) {
  return (event) => {
    if (
      !enabled.checked ||
      event.defaultPrevented ||
      event.isComposing ||
      event.keyCode === 229 ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      (event.shiftKey && event.key !== "?") ||
      event.target?.isContentEditable ||
      event.target?.closest?.(interactiveSelector)
    ) {
      return;
    }

    const rows = Array.from(list.children);
    const index = rows.indexOf(list.ownerDocument.activeElement);
    let target;
    switch (event.key) {
      case "/":
        target = search;
        break;
      case "n":
        target = input;
        break;
      case "?":
        help.open = true;
        target = help.querySelector("summary");
        break;
      case "j":
        target = rows[index < 0 ? 0 : index + 1];
        break;
      case "k":
        target = rows[index < 0 ? rows.length - 1 : index - 1];
        break;
      case "x":
        if (index < 0) return;
        event.preventDefault();
        void toggle(rows[index].dataset.id);
        return;
      default:
        return;
    }
    if (target) {
      event.preventDefault();
      target.focus();
    }
  };
}

export function captureItemFocus(list, activeElement) {
  const row = activeElement?.closest?.(".item");
  const index = Array.from(list.children).indexOf(row);
  if (index < 0) return null;
  const selector = [".item-toggle", ".item-priority", ".item-remove"].find(
    (selector) => activeElement.matches(selector),
  );
  return { id: row.dataset.id, index, selector };
}

export function restoreItemFocus(list, focus, fallback) {
  if (!focus) return;
  const rows = Array.from(list.children);
  const sameRow = rows.find((row) => row.dataset.id === focus.id);
  const target = sameRow
    ? (focus.selector && sameRow.querySelector(focus.selector)) || sameRow
    : rows[Math.min(focus.index, rows.length - 1)] || fallback;
  target.focus();
}
