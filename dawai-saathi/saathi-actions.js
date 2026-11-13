import { getState, saveList } from "./script.js";

// Site actions the Dawai Saathi agents can call (declared in agent-manifest.json -> actions.agentTools).
// The saving maths is done here in code, not by the model, so the rupee numbers are exact.
export function registerActions(actions) {
  actions.register({
    name: "calculate_monthly_saving",
    description: "Exact monthly saving when switching one medicine to its Jan Aushadhi generic. Needs what the user pays now for a strip, tablets per strip, tablets per day, and the Jan Aushadhi MRP and pack size returned by the price desk.",
    effect: "read",
    inputSchema: {
      type: "object", additionalProperties: false,
      required: ["medicine", "current_price_per_strip", "current_strip_size", "per_day", "jan_aushadhi_mrp", "jan_aushadhi_pack_size"],
      properties: {
        medicine: { type: "string", maxLength: 120 },
        current_price_per_strip: { type: "number", minimum: 0.1, maximum: 100000 },
        current_strip_size: { type: "integer", minimum: 1, maximum: 1000 },
        per_day: { type: "number", minimum: 0.25, maximum: 12 },
        jan_aushadhi_mrp: { type: "number", minimum: 0.1, maximum: 100000 },
        jan_aushadhi_pack_size: { type: "integer", minimum: 1, maximum: 1000 },
      },
    },
    execute: (a) => {
      const perMonth = a.per_day * 30;
      const now = (a.current_price_per_strip / a.current_strip_size) * perMonth;
      const ja = (a.jan_aushadhi_mrp / a.jan_aushadhi_pack_size) * perMonth;
      const r = (x) => Math.round(x * 100) / 100;
      return { medicine: a.medicine, tablets_per_month: perMonth, now_per_month_rs: r(now), jan_aushadhi_per_month_rs: r(ja),
               saving_per_month_rs: r(now - ja), saving_per_year_rs: r((now - ja) * 12),
               saving_percent: now > 0 ? Math.round(((now - ja) / now) * 100) : 0 };
    },
  });
  actions.register({
    name: "get_my_medicines",
    description: "Read the medicine list saved on this page (only in this browser).",
    effect: "read",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: () => getState(),
  });
  actions.register({
    name: "save_medicine_list",
    description: "Save the user's medicine list with the Jan Aushadhi generic for each, shown on this page and printable for the pharmacist. Stays in this browser only.",
    effect: "write",
    inputSchema: {
      type: "object", additionalProperties: false, required: ["items"],
      properties: {
        items: {
          type: "array", minItems: 1, maxItems: 20,
          items: {
            type: "object", additionalProperties: false, required: ["as_written", "salts"],
            properties: {
              as_written: { type: "string", maxLength: 80 },
              salts: { type: "string", maxLength: 160 },
              jan_aushadhi_name: { type: "string", maxLength: 200 },
              drug_code: { type: "string", maxLength: 20 },
              pack: { type: "string", maxLength: 40 },
              mrp_rs: { type: "number", minimum: 0, maximum: 100000 },
              saving_per_month_rs: { type: "number", minimum: -100000, maximum: 100000 },
            },
          },
        },
      },
    },
    execute: ({ items }) => saveList(items),
  });
}
