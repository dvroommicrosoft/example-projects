export const STATUS_FILTERS = {
  all: "all",
  active: "active",
  completed: "completed",
};

export function filterItems(items, filters = {}) {
  const query = (filters.query || "").trim().toLowerCase();
  const status = filters.status || STATUS_FILTERS.all;

  return items.filter((item) => {
    const matchesQuery = !query || item.title.toLowerCase().includes(query);
    const matchesStatus =
      status === STATUS_FILTERS.all ||
      (status === STATUS_FILTERS.active && !item.done) ||
      (status === STATUS_FILTERS.completed && item.done);

    return matchesQuery && matchesStatus;
  });
}

export function getEmptyStateMessage(items, filters = {}) {
  if (items.length === 0) {
    return "No items yet. Add one above! 🎉";
  }

  const query = (filters.query || "").trim();
  const status = filters.status || STATUS_FILTERS.all;
  const statusLabel =
    status === STATUS_FILTERS.active ? "active " : status === STATUS_FILTERS.completed ? "completed " : "";

  if (query) {
    return `No ${statusLabel}items match "${query}".`;
  }

  return `No ${statusLabel}items to show.`;
}
