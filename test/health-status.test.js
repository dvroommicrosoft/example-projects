import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  applyHealthView,
  createHealthMonitor,
  describeHealth,
} from "../public/health-status.js";

function createTimers() {
  const timers = new Map();
  let nextId = 1;

  return {
    timers,
    setTimeoutFn(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeoutFn(id) {
      timers.delete(id);
    },
  };
}

describe("health status", () => {
  test("describes each state with visible text and retry behavior", () => {
    assert.deepEqual(describeHealth("reachable"), {
      className: "api-health reachable",
      label: "API reachable",
      detail: "Tiny Triage is connected",
      retryHidden: true,
    });
    assert.equal(describeHealth("unreachable").retryHidden, false);
    assert.equal(describeHealth("checking").label, "Checking API");
  });

  test("applies a health view to the banner elements", () => {
    const elements = {
      banner: { className: "" },
      label: { textContent: "" },
      detail: { textContent: "" },
      retry: { hidden: true },
    };

    applyHealthView(elements, describeHealth("unreachable"));

    assert.equal(elements.banner.className, "api-health unreachable");
    assert.equal(elements.label.textContent, "API unreachable");
    assert.equal(elements.detail.textContent, "We’ll keep trying in the background");
    assert.equal(elements.retry.hidden, false);
  });

  test("reports reachable and schedules one follow-up check", async () => {
    const clock = createTimers();
    const changes = [];
    const monitor = createHealthMonitor({
      fetchFn: async () => ({ ok: true }),
      onChange: (view) => changes.push(view.label),
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      intervalMs: 123,
    });

    monitor.start();
    await monitor.checkNow();

    assert.equal(monitor.getState(), "reachable");
    assert.deepEqual(changes, ["API reachable"]);
    assert.deepEqual(
      Array.from(clock.timers.values()).map(({ delay }) => delay),
      [123],
    );
  });

  test("treats HTTP and network failures as unreachable without duplicate announcements", async () => {
    const clock = createTimers();
    const changes = [];
    let response = { ok: false };
    const monitor = createHealthMonitor({
      fetchFn: async () => {
        if (response instanceof Error) throw response;
        return response;
      },
      onChange: (view) => changes.push(view.label),
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
    });

    await monitor.checkNow();
    response = new Error("offline");
    await monitor.checkNow();

    assert.equal(monitor.getState(), "unreachable");
    assert.deepEqual(changes, ["API unreachable"]);
  });

  test("announces recovery after a failure", async () => {
    const changes = [];
    let ok = false;
    const monitor = createHealthMonitor({
      fetchFn: async () => ({ ok }),
      onChange: (view) => changes.push(view.label),
    });

    await monitor.checkNow();
    ok = true;
    await monitor.checkNow();

    assert.deepEqual(changes, ["API unreachable", "API reachable"]);
  });

  test("a manual retry announces checking before an unchanged failure", async () => {
    const changes = [];
    const monitor = createHealthMonitor({
      fetchFn: async () => ({ ok: false }),
      onChange: (view) => changes.push(view.label),
    });

    await monitor.checkNow();
    await monitor.checkNow({ showChecking: true });

    assert.deepEqual(changes, ["API unreachable", "Checking API", "API unreachable"]);
  });

  test("a timed-out request becomes unreachable", async () => {
    const clock = createTimers();
    const changes = [];
    const monitor = createHealthMonitor({
      fetchFn: (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
      onChange: (view) => changes.push(view.label),
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
      requestTimeoutMs: 50,
    });

    const pending = monitor.checkNow();
    const timeout = Array.from(clock.timers.values()).find(({ delay }) => delay === 50);
    timeout.callback();
    await pending;

    assert.equal(monitor.getState(), "unreachable");
    assert.deepEqual(changes, ["API unreachable"]);
  });

  test("coalesces concurrent checks and stop clears scheduled polling", async () => {
    const clock = createTimers();
    let resolveFetch;
    let calls = 0;
    const monitor = createHealthMonitor({
      fetchFn: () => {
        calls += 1;
        return new Promise((resolve) => {
          resolveFetch = resolve;
        });
      },
      onChange: () => {},
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
    });

    monitor.start();
    const pending = monitor.checkNow();
    assert.equal(calls, 1);
    resolveFetch({ ok: true });
    await pending;
    assert.equal(clock.timers.size, 1);

    monitor.stop();
    assert.equal(clock.timers.size, 0);
  });

  test("stopping an in-flight check does not announce an outage", async () => {
    const changes = [];
    let rejectFetch;
    const monitor = createHealthMonitor({
      fetchFn: (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          rejectFetch = () => reject(signal.reason);
          signal.addEventListener("abort", rejectFetch, { once: true });
        }),
      onChange: (view) => changes.push(view.label),
    });

    monitor.start();
    monitor.stop();
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(changes, []);
  });

  test("restarting during an aborted check performs an immediate fresh check", async () => {
    let calls = 0;
    const monitor = createHealthMonitor({
      fetchFn: (_url, { signal }) => {
        calls += 1;
        if (calls > 1) return Promise.resolve({ ok: true });
        return new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        });
      },
      onChange: () => {},
    });

    monitor.start();
    monitor.stop();
    monitor.start();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(calls, 2);
    assert.equal(monitor.getState(), "reachable");
    monitor.stop();
  });
});
