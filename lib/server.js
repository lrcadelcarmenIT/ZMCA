"use strict";

const crypto = require("node:crypto");

const MAX_BODY_BYTES = 16_384;
const requests = new Map();

function applyHeaders(res, methods = "POST, OPTIONS") {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function sendJson(res, status, body) {
  res.status(status).json(body);
}

function parseJsonBody(req) {
  const contentLength = Number(req.headers?.["content-length"] || 0);
  if (contentLength > MAX_BODY_BYTES) {
    const error = new Error("Request is too large.");
    error.status = 413;
    throw error;
  }
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      const error = new Error("Invalid JSON request.");
      error.status = 400;
      throw error;
    }
  }
  return {};
}

function cleanText(value, maxLength = 200) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || req.socket?.remoteAddress || "unknown").split(",")[0];
  return cleanText(ip, 80) || "unknown";
}

function enforceRateLimit(req, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const key = crypto.createHash("sha256").update(getClientIp(req)).digest("hex").slice(0, 24);
  const current = requests.get(key);
  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    const error = new Error("Too many requests. Please wait a few minutes and try again.");
    error.status = 429;
    throw error;
  }
  if (requests.size > 500) {
    for (const [storedKey, record] of requests) {
      if (record.resetAt <= now) requests.delete(storedKey);
    }
  }
}

function createReference() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `ZMCA-${date}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

module.exports = {
  applyHeaders,
  cleanText,
  createReference,
  enforceRateLimit,
  escapeHtml,
  parseJsonBody,
  sendJson
};
