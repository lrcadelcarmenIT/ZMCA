"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const required = [
  "index.html", "styles.css", "app.js", "vercel.json", "manifest.webmanifest", "icon.svg",
  "api/contact.js", "api/recommend.js", "api/health.js", "lib/server.js"
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

for (const marker of ["id=\"main\"", "id=\"finderForm\"", "id=\"contactForm\"", "aria-live=\"polite\"", "application/ld+json"]) {
  if (!html.includes(marker)) throw new Error(`Missing required HTML marker: ${marker}`);
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`Duplicate HTML ids: ${[...new Set(duplicates)].join(", ")}`);

const localRefs = [...html.matchAll(/(?:href|src)="\/(?!\/)([^"#?]+)"/g)].map((match) => match[1]);
for (const ref of localRefs) {
  if (ref.startsWith("api/")) continue;
  if (!fs.existsSync(path.join(root, ref))) throw new Error(`Broken local reference: /${ref}`);
}

if (!css.includes("prefers-reduced-motion")) throw new Error("Reduced-motion support is missing.");
if (!app.includes("textContent")) throw new Error("Expected safe DOM rendering was not found.");
if (html.includes("Photo placeholders")) throw new Error("Prototype placeholder copy remains in the production page.");

JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));

console.log(`Validated ${required.length} required files, ${ids.length} unique ids, and ${localRefs.length} local references.`);
