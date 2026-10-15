"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const required = [
  "index.html", "machines.html", "finder.html", "contact.html",
  "styles.css", "app.js", "vercel.json", "manifest.webmanifest", "icon.svg",
  "api/contact.js", "api/recommend.js", "api/health.js", "lib/server.js",
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}

const pages = ["index.html", "machines.html", "finder.html", "contact.html"];
const docs = Object.fromEntries(
  pages.map((page) => [page, fs.readFileSync(path.join(root, page), "utf8")])
);
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

// Per-page required markers.
const markers = {
  "index.html": ['id="main"', "application/ld+json", 'id="lobby-title"'],
  "machines.html": ['id="main"', 'id="equipment"', 'id="productSwitcher"'],
  "finder.html": ['id="main"', 'id="finderForm"', 'aria-live="polite"'],
  "contact.html": ['id="main"', 'id="contactForm"', 'aria-live="polite"'],
};
for (const [page, list] of Object.entries(markers)) {
  for (const marker of list) {
    if (!docs[page].includes(marker)) throw new Error(`Missing marker ${marker} in ${page}`);
  }
}

let totalIds = 0;
for (const [page, doc] of Object.entries(docs)) {
  const ids = [...doc.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`Duplicate HTML ids in ${page}: ${[...new Set(duplicates)].join(", ")}`);
  totalIds += ids.length;
  const localRefs = [...doc.matchAll(/(?:href|src)="\/((?!\/)[^"#?]+)"/g)].map((match) => match[1]);
  for (const ref of localRefs) {
    const clean = ref.split("#")[0];
    if (clean.startsWith("api/")) continue;
    if (!fs.existsSync(path.join(root, clean))) throw new Error(`Broken local reference in ${page}: /${ref}`);
  }
}

if (!css.includes("prefers-reduced-motion")) throw new Error("Reduced-motion support is missing.");
if (!app.includes("textContent")) throw new Error("Expected safe DOM rendering was not found.");
for (const [page, doc] of Object.entries(docs)) {
  if (doc.includes("Photo placeholders")) throw new Error(`Prototype placeholder copy remains in ${page}.`);
}

JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));

console.log(`Validated ${required.length} required files, ${totalIds} unique ids across ${pages.length} pages.`);
