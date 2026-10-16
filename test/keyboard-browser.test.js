import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createApp } from "../server.js";
import { createStore } from "../src/store.js";

const browserPath = process.env.TRIAGE_BROWSER;

test("keyboard workflow in a real browser", { skip: !browserPath, timeout: 90_000 }, async (t) => {
  assert.equal(typeof WebSocket, "function", "Browser tests require Node 22+ for built-in WebSocket");
  const profile = await mkdtemp(path.join(tmpdir(), "tiny-triage-keyboard-"));
  const browser = spawn(browserPath, [
    "--headless", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=0",
    `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  t.after(async () => {
    if (browser.exitCode === null) {
      browser.kill();
      await once(browser, "exit");
    }
    await rm(profile, { recursive: true, force: true });
  });
  const endpoint = await new Promise((resolve, reject) => {
    let stderr = "";
    browser.stderr.on("data", (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve(match[1]);
    });
    browser.once("error", reject);
    browser.once("exit", () => reject(new Error(`Browser startup failed: ${stderr}`)));
  });
  const socket = new WebSocket(endpoint);
  await once(socket, "open");
  t.after(() => socket.close());
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });
  function command(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  const { targetId } = await command("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await command("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => command(method, params, sessionId);
  await send("Page.enable");
  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", {
      expression, awaitPromise: true, returnByValue: true,
    });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function waitFor(expression) {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.fail(`Timed out waiting for ${expression}`);
  }
  async function key(key, { modifiers = 0, text = key === "Enter" ? "\r" : key.length === 1 ? key : undefined } = {}) {
    const windowsVirtualKeyCode = { Tab: 9, Enter: 13, " ": 32, Escape: 27 }[key];
    await send("Input.dispatchKeyEvent", { type: "keyDown", key, text, modifiers, windowsVirtualKeyCode });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key, modifiers, windowsVirtualKeyCode });
  }
  const focus = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  const active = () => evaluate(`document.activeElement.id || document.activeElement.className`);
  const activeRow = () => evaluate(`document.activeElement.closest(".item")?.dataset.id`);
  const row = (id) => `.item[data-id="${id}"]`;
  let app;
  const server = http.createServer((req, res) => app.emit("request", req, res));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  let scenario = 0;
  async function run(name, fn) {
    await t.test(name, async () => {
      app = createApp(createStore([
        { id: "1", title: "First open", done: false },
        { id: "2", title: "Second open", done: false },
        { id: "3", title: "Third done", done: true },
      ]));
      const url = `${base}/?scenario=${++scenario}`;
      await send("Page.navigate", { url });
      await waitFor(`location.href === ${JSON.stringify(url)}
        && document.readyState === "complete"
        && document.querySelectorAll(".item").length === 3`);
      await fn();
    });
  }
  async function filter(query) {
    await focus("#item-search");
    await evaluate(`document.querySelector("#item-search").value = ${JSON.stringify(query)};
      document.querySelector("#item-search").dispatchEvent(new Event("input", { bubbles: true }))`);
  }
  async function gate(method, status) {
    await evaluate(`(() => {
      const originalFetch = window.fetch;
      window.mutationCount = 0;
      window.fetch = (...args) => {
        if (args[1]?.method !== ${JSON.stringify(method)}) return originalFetch(...args);
        window.mutationCount++;
        return new Promise(resolve => {
          window.releaseMutation = async () => resolve(${status
            ? `new Response("{}", { status: ${status} })`
            : "await originalFetch(...args)"});
        });
      };
    })()`);
  }

  await run("search, new-entry, help and the disable switch are discoverable and work", async () => {
    await key("/");
    assert.equal(await active(), "item-search");
    await focus("#board-heading");
    await evaluate(`document.activeElement.blur()`);
    await key("n");
    assert.equal(await active(), "title-input");
    await evaluate(`document.activeElement.blur()`);
    await key("?", { modifiers: 8 });
    assert.equal(await evaluate(`document.querySelector("#keyboard-help").open`), true);
    assert.equal(await evaluate(`document.activeElement.tagName`), "SUMMARY");
    await evaluate(`document.querySelector("#keyboard-enabled").click(); document.activeElement.blur()`);
    await key("n");
    assert.notEqual(await active(), "title-input");
  });

  await run("typing and native controls are not intercepted", async () => {
    await evaluate(`document.querySelector("#keyboard-help").open = true`);
    for (const selector of [
      "#title-input", "#item-search", "#priority-input", ".item-toggle",
      ".item-priority", ".item-remove", "#keyboard-help summary",
    ]) {
      await focus(selector);
      const before = await active();
      for (const value of ["n", "/", "j", "k", "x", "?"]) await key(value);
      assert.equal(await active(), before, selector);
      if (selector === "#item-search") await filter("");
    }
    assert.equal(await evaluate(`document.querySelector("#title-input").value`), "n/jkx?");
    for (const markup of [
      '<textarea></textarea>', '<div contenteditable="true"><span>edit</span></div>',
      '<div role="textbox" tabindex="0"></div>',
    ]) {
      await evaluate(`document.body.insertAdjacentHTML("beforeend", ${JSON.stringify(markup)});
        document.body.lastElementChild.focus()`);
      assert.equal(await evaluate(`(() => {
        const event = new KeyboardEvent("keydown", { key: "n", bubbles: true, cancelable: true });
        const target = document.body.lastElementChild.querySelector("span") || document.body.lastElementChild;
        return target.dispatchEvent(event);
      })()`), true);
    }
    for (const modifiers of [1, 2, 4]) {
      await focus(row("1"));
      await key("n", { modifiers, text: undefined });
      assert.equal(await activeRow(), "1");
    }
  });

  await run("navigation follows filtered order and keeps visible focus at boundaries", async () => {
    await filter("open");
    assert.equal(await active(), "item-search");
    await evaluate(`document.activeElement.blur()`);
    await key("k");
    assert.equal(await activeRow(), "2");
    await key("j");
    assert.equal(await activeRow(), "2");
    await key("k");
    assert.equal(await activeRow(), "1");
    await key("k");
    assert.equal(await activeRow(), "1");
    assert.notEqual(await evaluate(`getComputedStyle(document.activeElement).outlineStyle`), "none");
    await key("Tab");
    assert.equal(await active(), "item-toggle");
    await key(" ");
    await waitFor(`document.querySelector('${row("1")}').classList.contains("done")`);
    assert.equal(await active(), "item-toggle");
  });

  await run("completion restores the row and never toggles an unfocused item", async () => {
    await focus(row("1"));
    await key("x");
    await waitFor(`document.querySelector('${row("1")}').classList.contains("done")`);
    assert.equal(await activeRow(), "1");
    assert.equal(await active(), "item done");
    await focus("#board-heading");
    await evaluate(`document.activeElement.blur()`);
    await key("x");
    assert.equal(await evaluate(`document.querySelectorAll(".item.done").length`), 2);
  });

  await run("completion under a status filter falls back to the next row then search", async () => {
    await evaluate(`document.querySelector('[data-status="open"]').click()`);
    await focus(row("1"));
    await key("x");
    await waitFor(`document.querySelectorAll(".item").length === 1`);
    assert.equal(await activeRow(), "2");
    await key("x");
    await waitFor(`document.querySelectorAll(".item").length === 0`);
    assert.equal(await active(), "item-search");
  });

  await run("deletion focuses the next row, previous row, then search", async () => {
    for (const [id, expected] of [["2", "3"], ["3", "1"], ["1", undefined]]) {
      await focus(`${row(id)} .item-remove`);
      await key("Enter");
      await waitFor(`!document.querySelector('${row(id)}')`);
      assert.equal(await activeRow(), expected);
    }
    assert.equal(await active(), "item-search");
  });

  await run("adding and no-match filtering keep predictable input focus", async () => {
    await focus("#title-input");
    await send("Input.insertText", { text: "Keyboard-created" });
    await key("Enter");
    await waitFor(`document.querySelectorAll(".item").length === 4`);
    assert.equal(await active(), "title-input");
    assert.equal(await evaluate(`document.querySelector("#title-input").value`), "");
    await filter("no matching item");
    assert.equal(await active(), "item-search");
    assert.equal(await evaluate(`document.querySelector("#no-match-state").hidden`), false);
    await focus('[data-status="done"]');
    await key("Enter");
    assert.equal(await evaluate(`document.activeElement.dataset.status`), "done");
  });

  await run("failed checkbox and shortcut completion retain focus and show the error", async () => {
    await gate("PATCH", 500);
    for (const useShortcut of [false, true]) {
      await focus(useShortcut ? row("1") : `${row("1")} .item-toggle`);
      const before = await active();
      await key(useShortcut ? "x" : " ");
      await evaluate(`window.releaseMutation()`);
      await waitFor(`!document.querySelector("#error-message").hidden`);
      assert.equal(await active(), before);
      assert.equal(await evaluate(`document.querySelector('${row("1")} .item-toggle').checked`), false);
      assert.equal(await evaluate(`document.querySelector("#error-message").textContent`), "Failed to update item");
    }
  });

  await run("failed deletion and creation keep controls, text, focus and errors", async () => {
    await gate("DELETE", 500);
    await focus(`${row("1")} .item-remove`);
    await key("Enter");
    await evaluate(`window.releaseMutation()`);
    await waitFor(`!document.querySelector("#error-message").hidden`);
    assert.equal(await active(), "item-remove");
    assert.equal(await activeRow(), "1");
    await gate("POST", 400);
    await focus("#title-input");
    await send("Input.insertText", { text: "Keep this title" });
    await key("Enter");
    await evaluate(`window.releaseMutation()`);
    await waitFor(`document.querySelector("#error-message").textContent === "Failed to add item"`);
    assert.equal(await active(), "title-input");
    assert.equal(await evaluate(`document.querySelector("#title-input").value`), "Keep this title");
  });

  for (const method of ["PATCH", "DELETE", "POST"]) {
    await run(`delayed ${method} does not steal focus`, async () => {
      await gate(method);
      if (method === "POST") {
        await focus("#title-input");
        await send("Input.insertText", { text: "Delayed item" });
        await key("Enter");
      } else {
        await focus(method === "PATCH" ? row("1") : `${row("1")} .item-remove`);
        await key(method === "PATCH" ? "x" : "Enter");
        if (method === "PATCH") {
          await key("x");
          assert.equal(await evaluate(`window.mutationCount`), 1);
        }
      }
      await focus("#item-search");
      await evaluate(`window.releaseMutation()`);
      await waitFor(method === "DELETE" ? `document.querySelectorAll(".item").length === 2`
        : method === "POST" ? `document.querySelectorAll(".item").length === 4`
          : `document.querySelector('${row("1")}').classList.contains("done")`);
      assert.equal(await active(), "item-search");
    });
  }
});
