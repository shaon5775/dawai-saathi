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

// A single-salt query must never call a combination product "exact" (bug found 13 Nov: "&" was not counted).
let bad = 0;
for (const single of ["Metformin 500 mg", "Paracetamol 325 mg", "Telmisartan 40 mg", "Amlodipine 5 mg"]) {
  for (const p of tool.invoke({ salts: single, max_results: 8 }).results) {
    const combo = /\band\b|&|\+|\bwith\b/i.test(p.generic_name.replace(/w\/w|w\/v/gi, ""));
    if (p.match === "exact" && combo) { bad += 1; console.log(`  WRONG exact: ${single} -> ${p.generic_name}`); }
  }
}
// Release type: plain vs SR must not both be "exact"; Pan-D (Domperidone SR capsule) must be exact.
const plain = tool.invoke({ salts: "Metformin 500 mg", form: "tablet", max_results: 8 }).results;
const srAsExact = plain.filter((p) => p.match === "exact" && /prolonged|sustained|extended/i.test(p.generic_name));
console.log(srAsExact.length ? `release check: WRONG (${srAsExact[0].generic_name})` : "release check: OK (SR not exact for plain Metformin)");
const pand = tool.invoke({ salts: "Pantoprazole 40 mg + Domperidone 30 mg SR", form: "capsule" });
console.log(`Pan-D with SR: ${pand.best_match} -> ${pand.results[0]?.generic_name}`);
console.log(bad ? `combination check: ${bad} wrong` : "combination check: OK (no combination product marked exact for a single salt)");
