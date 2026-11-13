// Quick check of the coded tool:  node tools/test_lookup.mjs
import { JanAushadhiLookup } from "../price-desk/tools/price_lookup.js";

const tool = new JanAushadhiLookup();
const cases = [
  "Telmisartan 40 mg", "Pantoprazole 40 mg + Domperidone 30 mg", "Metformin 500 mg", "Paracetamol 650 mg",
  "Amlodipine 5 mg", "Atorvastatin 10 mg", "Levothyroxine 50 mcg", "Amoxycillin 500 mg + Clavulanate 125 mg",
  "Montelukast 10 mg + Levocetirizine 5 mg", "Rosuvastatin 10 mg", "Glimepiride 1 mg + Metformin 500 mg",
];
let exact = 0;
for (const c of cases) {
  const r = tool.invoke({ salts: c, form: "tablet", max_results: 2 });
  const top = r.results[0];
  if (r.best_match === "exact") exact += 1;
  console.log(`${c.padEnd(42)} → ${r.best_match.padEnd(30)} ${top ? `${top.generic_name} | ${top.pack} | ₹${top.mrp_rs} (₹${top.price_per_unit_rs}/unit)` : "-"}`);
}
console.log(`exact: ${exact}/${cases.length}`);
