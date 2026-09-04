"use strict";

const { applyHeaders, sendJson } = require("../lib/server");

module.exports = function health(req, res) {
  applyHeaders(res, "GET, HEAD, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!["GET", "HEAD"].includes(req.method)) return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  return sendJson(res, 200, { ok: true, service: "zmca-machinery", version: "1.0.0" });
};
