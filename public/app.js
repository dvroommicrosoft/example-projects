// public/app.js
// Vanilla JS front-end for Tiny Triage. No build step, no dependencies.

import { STATUS_FILTERS, filterItems, getEmptyStateMessage } from "./filter.js";

const listEl = document.getElementById("item-list");
const emptyStateEl = document.getElementById("empty-state");
const formEl = document.getElementById("add-form");
const inputEl = document.getElementById("title-input");
const searchInputEl = document.getElementById("search-input");
const statusFilterEl = document.getElementById("status-filter");
const errorEl = document.getElementById("error-message");
const statusPillEl = document.getElementById("status-pill");

let items = [];
const filters = {
  query: "",
  status: STATUS_FILTERS.all,
};

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function renderItems(items) {
  listEl.innerHTML = "";

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "item" + (item.done ? " done" : "");
    li.dataset.id = item.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "item-toggle";
    checkbox.checked = item.done;
    checkbox.setAttribute("aria-label", `Mark "${item.title}" as ${item.done ? "not done" : "done"}`);
    checkbox.addEventListener("change", () => toggleItem(item.id));

    const title = document.createElement("span");
    title.className = "item-title";
    title.textContent = item.title;

    const removeBtn = document.createElement("button");
    removeBtn.className = "item-remove";
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", `Remove "${item.title}"`);
    removeBtn.addEventListener("click", () => removeItem(item.id));

    li.append(checkbox, title, removeBtn);
    listEl.append(li);
  }
}

function renderFilteredItems() {
  const visibleItems = filterItems(items, filters);
  renderItems(visibleItems);
  emptyStateEl.textContent = getEmptyStateMessage(items, filters);
  emptyStateEl.hidden = visibleItems.length > 0;
}

async function fetchItems() {
  const res = await fetch("/api/items");
  const data = await res.json();
  items = data.items || [];
  renderFilteredItems();
}

async function addItem(title) {
  clearError();
  const res = await fetch("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    showError(data.error || "Failed to add item");
    return;
  }
  await fetchItems();
}

async function toggleItem(id) {
  clearError();
  const res = await fetch(`/api/items/${encodeURIComponent(id)}`, { method: "PATCH" });
  if (!res.ok) {
    showError("Failed to update item");
    return;
  }
  await fetchItems();
}

async function removeItem(id) {
  clearError();
  const res = await fetch(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    showError("Failed to remove item");
    return;
  }
  await fetchItems();
}

async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    if (res.ok) {
      statusPillEl.textContent = "API: healthy";
      statusPillEl.className = "status-pill ok";
    } else {
      throw new Error("unhealthy");
    }
  } catch {
    statusPillEl.textContent = "API: unreachable";
    statusPillEl.className = "status-pill down";
  }
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = inputEl.value.trim();
  if (!title) return;
  await addItem(title);
  inputEl.value = "";
  inputEl.focus();
});

searchInputEl.addEventListener("input", () => {
  filters.query = searchInputEl.value;
  renderFilteredItems();
});

statusFilterEl.addEventListener("change", (event) => {
  if (!event.target.matches('input[name="status-filter"]')) {
    return;
  }

  filters.status = event.target.value;
  renderFilteredItems();
});

fetchItems();
checkHealth();
