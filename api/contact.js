"use strict";

const { applyHeaders, cleanText, createReference, enforceRateLimit, escapeHtml, parseJsonBody, sendJson } = require("../lib/server");

const allowedTimelines = new Set(["researching", "1-3-months", "3-6-months", "urgent"]);

function messengerUrl(inquiry) {
  const lines = [
    `Hi ZMCA! Inquiry reference: ${inquiry.reference}`,
    `Name: ${inquiry.name}`,
    inquiry.company ? `Business: ${inquiry.company}` : "",
    `Contact: ${inquiry.contact}`,
    `Product: ${inquiry.product}`,
    `Interest: ${inquiry.interest}`,
    inquiry.output ? `Target output: ${inquiry.output}` : "",
    `Timeline: ${inquiry.timeline}`,
    `Details: ${inquiry.message}`
  ].filter(Boolean);
  return `https://m.me/zmcatrading?text=${encodeURIComponent(lines.join("\n"))}`;
}

async function sendWebhook(inquiry) {
  const url = process.env.INQUIRY_WEBHOOK_URL;
  if (!url) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const headers = { "Content-Type": "application/json" };
    if (process.env.INQUIRY_WEBHOOK_SECRET) headers.Authorization = `Bearer ${process.env.INQUIRY_WEBHOOK_SECRET}`;
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(inquiry), signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function sendEmail(inquiry) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.INQUIRY_TO_EMAIL;
  if (!apiKey || !to) return false;
  const from = process.env.INQUIRY_FROM_EMAIL || "ZMCA Website <onboarding@resend.dev>";
  const rows = Object.entries(inquiry)
    .filter(([key]) => key !== "submittedAt")
    .map(([key, value]) => `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700">${escapeHtml(key)}</td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(value)}</td></tr>`)
    .join("");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: `New ZMCA inquiry — ${inquiry.reference}`, html: `<h2>New equipment inquiry</h2><table style="border-collapse:collapse">${rows}</table>` })
    });
    return response.ok;
  } catch {
    return false;
  }
}

module.exports = async function contact(req, res) {
  applyHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed." });

  try {
    enforceRateLimit(req, 6, 10 * 60 * 1000);
    const body = parseJsonBody(req);
    if (cleanText(body.website, 200)) return sendJson(res, 200, { ok: true, reference: createReference(), messengerUrl: "https://m.me/zmcatrading", notification: "filtered" });

    const inquiry = {
      reference: createReference(),
      name: cleanText(body.name, 80),
      company: cleanText(body.company, 100),
      contact: cleanText(body.contact, 120),
      product: cleanText(body.product, 120),
      interest: cleanText(body.interest, 100),
      output: cleanText(body.output, 80),
      timeline: cleanText(body.timeline, 30),
      message: cleanText(body.message, 1500),
      submittedAt: new Date().toISOString()
    };

    if (!inquiry.name || !inquiry.contact || !inquiry.product || !inquiry.interest || !inquiry.message || body.consent !== true) {
      return sendJson(res, 400, { ok: false, error: "Please complete all required fields and provide consent." });
    }
    if (!allowedTimelines.has(inquiry.timeline)) inquiry.timeline = "researching";

    const [webhookSent, emailSent] = await Promise.all([sendWebhook(inquiry), sendEmail(inquiry)]);
    return sendJson(res, 200, {
      ok: true,
      reference: inquiry.reference,
      messengerUrl: messengerUrl(inquiry),
      notification: webhookSent || emailSent ? "sent" : "messenger_required"
    });
  } catch (error) {
    return sendJson(res, error.status || 500, { ok: false, error: error.status ? error.message : "The inquiry service is temporarily unavailable." });
  }
};
