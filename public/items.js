async function readError(response, fallback) {
  const data = await response.json().catch(() => ({}));
  return data.error || fallback;
}

export async function listItemsRequest(fetchFn) {
  const response = await fetchFn("/api/items");
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to load items"));
  }

  const data = await response.json();
  if (
    !Array.isArray(data.items) ||
    !data.items.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.done === "boolean",
    )
  ) {
    throw new Error("Failed to load items");
  }
  return data.items;
}

export function filterItems(items, query, status) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return items.filter((item) => {
    const matchesTitle = item.title.toLocaleLowerCase().includes(normalizedQuery);
    const matchesStatus =
      status === "all" ||
      (status === "open" && !item.done) ||
      (status === "done" && item.done);
    return matchesTitle && matchesStatus;
  });
}

export function countItemsByStatus(items) {
  const done = items.filter((item) => item.done).length;
  return { all: items.length, open: items.length - done, done };
}

export async function addItemRequest(fetchFn, title, priority) {
  const response = await fetchFn("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, priority }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to add item"));
  }
  return (await response.json()).item;
}

export async function setItemPriority(fetchFn, id, priority) {
  const response = await fetchFn(`/api/items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priority }),
  });
  if (!response.ok) {
    throw new Error(await readError(response, "Failed to update priority"));
  }
  return (await response.json()).item;
}

export function createPriorityUpdater({ initialPriority, save, onConfirmed, onRejected }) {
  let confirmed = initialPriority;
  let desired = initialPriority;
  let pending;

  async function drain() {
    if (pending) return pending;

    pending = (async () => {
      while (desired !== confirmed) {
        const requested = desired;
        try {
          const item = await save(requested);
          confirmed = item.priority;
          onConfirmed(item, desired === confirmed);
        } catch (error) {
          const shouldRestore = desired === requested;
          if (shouldRestore) desired = confirmed;
          onRejected(error, confirmed, shouldRestore);
        }
      }
    })();

    await pending;
    pending = undefined;
    if (desired !== confirmed) return drain();
  }

  return {
    change(priority) {
      desired = priority;
      return drain();
    },
    getConfirmed: () => confirmed,
    getDesired: () => desired,
    isPending: () => pending !== undefined || desired !== confirmed,
  };
}
