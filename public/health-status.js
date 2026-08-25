export const HEALTH_CHECK_INTERVAL_MS = 15_000;
export const HEALTH_REQUEST_TIMEOUT_MS = 4_000;

const HEALTH_VIEWS = {
  checking: {
    className: "api-health checking",
    label: "Checking API",
    detail: "Confirming the connection…",
    retryHidden: true,
  },
  reachable: {
    className: "api-health reachable",
    label: "API reachable",
    detail: "Tiny Triage is connected",
    retryHidden: true,
  },
  unreachable: {
    className: "api-health unreachable",
    label: "API unreachable",
    detail: "We’ll keep trying in the background",
    retryHidden: false,
  },
};

export function describeHealth(state) {
  return HEALTH_VIEWS[state] || HEALTH_VIEWS.checking;
}

export function applyHealthView(elements, view) {
  elements.banner.className = view.className;
  elements.label.textContent = view.label;
  elements.detail.textContent = view.detail;
  elements.retry.hidden = view.retryHidden;
}

export function createHealthMonitor({
  fetchFn,
  onChange,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  intervalMs = HEALTH_CHECK_INTERVAL_MS,
  requestTimeoutMs = HEALTH_REQUEST_TIMEOUT_MS,
}) {
  let state = "checking";
  let running = false;
  let pollTimer;
  let requestTimer;
  let controller;
  let pending;
  let ignoreCurrentResult = false;
  let restartAfterPending = false;

  function setState(nextState) {
    if (state === nextState) return;
    state = nextState;
    onChange(describeHealth(state));
  }

  function clearPollTimer() {
    if (pollTimer !== undefined) {
      clearTimeoutFn(pollTimer);
      pollTimer = undefined;
    }
  }

  async function checkNow({ showChecking = false } = {}) {
    if (showChecking) setState("checking");
    if (pending) return pending;

    clearPollTimer();
    ignoreCurrentResult = false;
    controller = new AbortController();
    requestTimer = setTimeoutFn(() => controller.abort(), requestTimeoutMs);

    pending = (async () => {
      try {
        const response = await fetchFn("/api/health", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!ignoreCurrentResult) {
          setState(response.ok ? "reachable" : "unreachable");
        }
      } catch {
        if (!ignoreCurrentResult) {
          setState("unreachable");
        }
      } finally {
        clearTimeoutFn(requestTimer);
        requestTimer = undefined;
        controller = undefined;
        pending = undefined;
        if (running && restartAfterPending) {
          restartAfterPending = false;
          void checkNow();
        } else if (running) {
          pollTimer = setTimeoutFn(checkNow, intervalMs);
        }
      }
    })();

    return pending;
  }

  function start() {
    if (running) return;
    running = true;
    if (pending) {
      restartAfterPending = true;
      return;
    }
    void checkNow();
  }

  function stop() {
    running = false;
    restartAfterPending = false;
    clearPollTimer();
    if (requestTimer !== undefined) {
      clearTimeoutFn(requestTimer);
      requestTimer = undefined;
    }
    if (controller) {
      ignoreCurrentResult = true;
      controller.abort();
    }
  }

  return {
    start,
    stop,
    checkNow,
    getState: () => state,
  };
}
