"use strict";

const { applyHeaders, cleanText, enforceRateLimit, parseJsonBody, sendJson } = require("../lib/server");

const products = {
  bakery: {
    label: "Bakery production",
    process: ["Mixing and dough preparation", "Dividing, forming, or depositing", "Baking and cooling workflow"],
    packaging: ["Product-appropriate sealing", "Date coding and labeling"]
  },
  beverage: {
    label: "Beverage production",
    process: ["Mixing and liquid preparation", "Filtration or thermal-processing review", "Buffer and transfer planning"],
    packaging: ["Liquid filling system", "Capping, sealing, and labeling"]
  },
  sauce: {
    label: "Sauce and condiment production",
    process: ["Mixing or cooking vessel", "Viscosity-appropriate transfer", "Holding and temperature-control review"],
    packaging: ["Paste or liquid filling system", "Capping or pouch sealing"]
  },
  snack: {
    label: "Snack and dry-goods production",
    process: ["Preparation and forming equipment", "Cooking or drying stage", "Seasoning and product handling"],
    packaging: ["Weighing or volumetric dosing", "Form-fill-seal packaging"]
  },
  meat: {
    label: "Processed-protein production",
    process: ["Preparation and size-reduction equipment", "Mixing, forming, or stuffing", "Temperature and sanitation review"],
    packaging: ["Vacuum or tray-pack review", "Sealing and product coding"]
  },
  frozen: {
    label: "Frozen or chilled-food production",
    process: ["Preparation and forming stage", "Cooling or freezing workflow", "Cold-chain handling review"],
    packaging: ["Moisture-appropriate sealing", "Labeling and date coding"]
  },
  other: {
    label: "Custom food production",
    process: ["Product and process assessment", "Critical production-stage identification", "Material-handling review"],
    packaging: ["Package-format assessment", "Filling, sealing, and coding review"]
  }
};

const scaleNotes = {
  starter: "Prioritize a compact, operator-friendly setup that can grow without over-automating the first stage.",
  growing: "Target the current bottleneck first, while allowing the next machine or conveyor stage to integrate cleanly.",
  industrial: "Review line balancing, utilities, sanitation, changeover time, and downstream capacity before final specification."
};

function unique(items) {
  return [...new Set(items)];
}

module.exports = async function recommend(req, res) {
  applyHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed." });

  try {
    enforceRateLimit(req, 18, 10 * 60 * 1000);
    const body = parseJsonBody(req);
    const productKey = cleanText(body.product, 30);
    const scale = cleanText(body.scale, 30);
    const need = cleanText(body.need, 30);
    const output = cleanText(body.output, 80);

    if (!products[productKey] || !scaleNotes[scale] || !["processing", "packaging", "full-line", "unsure"].includes(need)) {
      return sendJson(res, 400, { ok: false, error: "Please complete the required finder fields." });
    }

    const profile = products[productKey];
    let selected = [];
    if (need === "processing") selected = profile.process;
    if (need === "packaging") selected = profile.packaging;
    if (need === "full-line" || need === "unsure") selected = [...profile.process.slice(0, 2), ...profile.packaging];
    selected = unique(selected).slice(0, 4);

    const recommendations = selected.map((name, index) => ({
      name,
      reason: index === 0
        ? `Start here to establish a stable ${profile.label.toLowerCase()} workflow.`
        : "Confirm this stage against the product, package format, available space, utilities, and upstream capacity."
    }));

    const outputText = output ? ` The stated target is ${output}.` : " Output capacity should be confirmed during consultation.";
    return sendJson(res, 200, {
      ok: true,
      title: `${profile.label}: starting equipment plan`,
      summary: `${scaleNotes[scale]}${outputText}`,
      recommendations,
      disclaimer: "Initial planning guidance only; final machine selection requires product and site review."
    });
  } catch (error) {
    return sendJson(res, error.status || 500, { ok: false, error: error.status ? error.message : "Unable to build a recommendation right now." });
  }
};
