// public/app.js
// Vanilla JS front-end for Tiny Triage. No build step, no dependencies.

import { buildReportsQuery, formatTotals } from "./reports.js";
import { applyHealthView, createHealthMonitor } from "./health-status.js";
import {
  addItemRequest,
  countItemsByStatus,
  createPriorityUpdater,
  filterItems,
  listItemsRequest,
  setItemPriority,
} from "./items.js";

const listEl = document.getElementById("item-list");
const emptyStateEl = document.getElementById("empty-state");
const noMatchStateEl = document.getElementById("no-match-state");
const searchEl = document.getElementById("item-search");
const statusFilterEls = Array.from(document.querySelectorAll("[data-status]"));
const filterCountEls = Array.from(document.querySelectorAll("[data-count]"));
const clearFiltersEl = document.getElementById("clear-filters");
const itemsSummaryEl = document.getElementById("items-summary");
const formEl = document.getElementById("add-form");
const inputEl = document.getElementById("title-input");
const priorityEl = document.getElementById("priority-input");
const errorEl = document.getElementById("error-message");
const priorityStatusEl = document.getElementById("priority-status");
const healthElements = {
  banner: document.getElementById("api-health"),
  label: document.getElementById("api-health-label"),
  detail: document.getElementById("api-health-detail"),
  retry: document.getElementById("api-health-retry"),
};
const reportsFormEl = document.getElementById("reports-form");
const reportsFromEl = document.getElementById("reports-from");
const reportsToEl = document.getElementById("reports-to");
const reportsTypeFilterEl = document.getElementById("reports-type-filter");
const reportsErrorEl = document.getElementById("reports-error");
const reportsTotalsEl = document.getElementById("reports-totals");
const reportsTableEl = document.getElementById("reports-table");
const reportsTableBodyEl = document.getElementById("reports-table-body");
const reportsEmptyEl = document.getElementById("reports-empty");
let items = [];
let selectedStatus = "all";
let itemsLoaded = false;
const priorityUpdaters = new Map();

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function findPriorityControl(itemId) {
  const row = Array.from(listEl.children).find((element) => element.dataset.id === itemId);
  return row?.querySelector(".item-priority");
}

function updatePriorityControl(itemId, priority) {
  const control = findPriorityControl(itemId);
  if (!control) return;
  control.value = priority;
  control.className = `item-priority priority-${priority}`;
}

function getPriorityUpdater(item) {
  let updater = priorityUpdaters.get(item.id);
  if (updater) return updater;

  updater = createPriorityUpdater({
    initialPriority: item.priority,
    save: (value) => setItemPriority(fetch, item.id, value),
    onConfirmed: (updated, isLatest) => {
      const currentItem = items.find(({ id }) => id === item.id);
      if (currentItem) currentItem.priority = updated.priority;
      if (isLatest) updatePriorityControl(item.id, updated.priority);
      priorityStatusEl.textContent = `Priority for "${item.title}" changed to ${updated.priority}`;
    },
    onRejected: (error, confirmed, shouldRestore) => {
      if (shouldRestore) updatePriorityControl(item.id, confirmed);
      showError(error.message);
    },
  });
  priorityUpdaters.set(item.id, updater);
  return updater;
}

function renderItems({ focusItemId, focusSelector } = {}) {
  const visibleItems = filterItems(items, searchEl.value, selectedStatus);
  const counts = countItemsByStatus(items);
  listEl.innerHTML = "";
  emptyStateEl.hidden = !itemsLoaded || items.length > 0;
  noMatchStateEl.hidden = !itemsLoaded || items.length === 0 || visibleItems.length > 0;
  itemsSummaryEl.textContent = itemsLoaded
    ? `Showing ${visibleItems.length} of ${items.length} items`
    : "Loading items…";
  clearFiltersEl.disabled = searchEl.value.length === 0 && selectedStatus === "all";

  for (const button of statusFilterEls) {
    button.setAttribute("aria-pressed", String(button.dataset.status === selectedStatus));
  }
  for (const count of filterCountEls) {
    count.textContent = counts[count.dataset.count];
  }

  for (const item of visibleItems) {
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

    const priority = document.createElement("select");
    const priorityUpdater = getPriorityUpdater(item);
    const displayedPriority = priorityUpdater.isPending()
      ? priorityUpdater.getDesired()
      : item.priority;
    priority.id = `priority-${item.id}`;
    priority.className = `item-priority priority-${displayedPriority}`;
    priority.setAttribute("aria-label", `Priority for "${item.title}"`);
    for (const value of ["low", "medium", "high"]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value[0].toUpperCase() + value.slice(1);
      option.selected = value === displayedPriority;
      priority.append(option);
    }
    priority.addEventListener("change", () => {
      clearError();
      priority.className = `item-priority priority-${priority.value}`;
      void priorityUpdater.change(priority.value);
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "item-remove";
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", `Remove "${item.title}"`);
    removeBtn.addEventListener("click", () => removeItem(item.id));

    li.append(checkbox, title, priority, removeBtn);
    listEl.append(li);
  }

  if (focusItemId && focusSelector) {
    const row = Array.from(listEl.children).find((element) => element.dataset.id === focusItemId);
    const target = row?.querySelector(focusSelector);
    if (target) {
      target.focus();
    } else {
      statusFilterEls.find((button) => button.dataset.status === selectedStatus)?.focus();
    }
  }
}

async function fetchItems(focus = {}) {
  try {
    const nextItems = await listItemsRequest(fetch);
    items = nextItems;
    itemsLoaded = true;
    renderItems(focus);
    return true;
  } catch (error) {
    showError(error.message);
    if (itemsLoaded) {
      renderItems(focus);
    } else {
      itemsSummaryEl.textContent = "Unable to load items";
    }
    return false;
  }
}

async function addItem(title, priority) {
  clearError();
  try {
    await addItemRequest(fetch, title, priority);
    await fetchItems();
    return true;
  } catch (error) {
    showError(error.message);
    return false;
  }
}

async function toggleItem(id) {
  clearError();
  try {
    const res = await fetch(`/api/items/${encodeURIComponent(id)}`, { method: "PATCH" });
    if (!res.ok) {
      showError("Failed to update item");
      return;
    }
    await fetchItems({ focusItemId: id, focusSelector: ".item-toggle" });
  } catch {
    showError("Failed to update item");
  }
}

async function removeItem(id) {
  clearError();
  try {
    const res = await fetch(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      showError("Failed to remove item");
      return;
    }
    priorityUpdaters.delete(id);
    await fetchItems({ focusItemId: id, focusSelector: ".item-remove" });
  } catch {
    showError("Failed to remove item");
  }
}

const healthMonitor = createHealthMonitor({
  fetchFn: fetch,
  onChange: (view) => {
    if (view.retryHidden && document.activeElement === healthElements.retry) {
      healthElements.banner.focus();
    }
    applyHealthView(healthElements, view);
  },
});

healthElements.retry.addEventListener("click", () => {
  void healthMonitor.checkNow({ showChecking: true });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    healthMonitor.stop();
  } else {
    healthMonitor.start();
  }
});

window.addEventListener("pagehide", () => healthMonitor.stop());

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = inputEl.value.trim();
  if (!title) return;
  const added = await addItem(title, priorityEl.value);
  if (added) {
    inputEl.value = "";
    priorityEl.value = "medium";
  }
  inputEl.focus();
});

searchEl.addEventListener("input", () => renderItems());

for (const button of statusFilterEls) {
  button.addEventListener("click", () => {
    selectedStatus = button.dataset.status;
    renderItems();
  });
}

clearFiltersEl.addEventListener("click", () => {
  searchEl.value = "";
  selectedStatus = "all";
  renderItems();
  searchEl.focus();
});

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSelectedReportTypes() {
  return Array.from(reportsTypeFilterEl.querySelectorAll('input[name="reports-type"]:checked')).map(
    (input) => input.value,
  );
}

function renderReportsTable(buckets) {
  reportsTableBodyEl.innerHTML = "";
  for (const bucket of buckets) {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${bucket.date}</td><td>${bucket.created}</td><td>${bucket.completed}</td><td>${bucket.reopened}</td><td>${bucket.deleted}</td>`;
    reportsTableBodyEl.append(row);
  }
  reportsTableEl.hidden = buckets.length === 0;
  reportsEmptyEl.hidden = buckets.length > 0;
}

async function fetchReport() {
  reportsErrorEl.hidden = true;
  reportsErrorEl.textContent = "";

  const types = getSelectedReportTypes();
  const query = buildReportsQuery({
    from: reportsFromEl.value,
    to: reportsToEl.value,
    types,
  });

  const res = await fetch(`/api/reports${query}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    reportsErrorEl.textContent = data.error || "Failed to generate report";
    reportsErrorEl.hidden = false;
    reportsTotalsEl.textContent = "";
    renderReportsTable([]);
    return;
  }

  const report = await res.json();
  reportsTotalsEl.textContent = formatTotals(report.totals);
  renderReportsTable(report.buckets);
}

function initReportsDefaults() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  reportsToEl.value = toDateInputValue(now);
  reportsFromEl.value = toDateInputValue(weekAgo);
}

reportsFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  if (getSelectedReportTypes().length === 0) {
    reportsErrorEl.textContent = "Select at least one event type";
    reportsErrorEl.hidden = false;
    reportsTotalsEl.textContent = "";
    renderReportsTable([]);
    return;
  }
  fetchReport();
});

fetchItems();
if (!document.hidden) healthMonitor.start();
initReportsDefaults();
fetchReport();
