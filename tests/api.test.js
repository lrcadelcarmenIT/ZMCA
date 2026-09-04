"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const contact = require("../api/contact");
const recommend = require("../api/recommend");
const health = require("../api/health");

function invoke(handler, { method = "GET", body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = { method, body, headers, socket: { remoteAddress: `test-${Math.random()}` } };
    const state = { statusCode: 200, headers: {}, body: null };
    const res = {
      setHeader(name, value) { state.headers[name.toLowerCase()] = value; },
      status(code) { state.statusCode = code; return this; },
      json(value) { state.body = value; resolve(state); },
      end(value) { state.body = value; resolve(state); }
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

test("health endpoint reports service readiness", async () => {
  const response = await invoke(health);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.service, "zmca-machinery");
});

test("recommend endpoint returns a useful equipment plan", async () => {
  const response = await invoke(recommend, {
    method: "POST",
    body: { product: "sauce", scale: "growing", need: "full-line", output: "500 bottles per day" }
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.match(response.body.title, /Sauce/);
  assert.ok(response.body.recommendations.length >= 3);
});

test("recommend endpoint rejects incomplete selections", async () => {
  const response = await invoke(recommend, { method: "POST", body: { product: "sauce" } });
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.ok, false);
});

test("contact endpoint validates required fields", async () => {
  const response = await invoke(contact, { method: "POST", body: { name: "Chris" } });
  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /required/i);
});

test("contact endpoint creates a reference and Messenger handoff", async () => {
  const response = await invoke(contact, {
    method: "POST",
    body: {
      name: "Chris",
      company: "ZMCA",
      contact: "chris@example.com",
      product: "Bottled sauce",
      interest: "Complete production line",
      output: "500 bottles per day",
      timeline: "1-3-months",
      message: "I need a practical starting line.",
      consent: true,
      website: ""
    }
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.match(response.body.reference, /^ZMCA-\d{8}-[A-F0-9]{6}$/);
  assert.match(response.body.messengerUrl, /^https:\/\/m\.me\/zmcatrading\?text=/);
});

test("API endpoints reject unsupported methods", async () => {
  const response = await invoke(recommend, { method: "GET" });
  assert.equal(response.statusCode, 405);
});
