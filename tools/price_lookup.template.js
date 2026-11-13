// Jan Aushadhi price lookup — a coded tool for the open agentic web (nsDeploy runtime).
// Runs inside the CALLER's sandboxed worker: no network, no DOM. The official price table is embedded below.
// Source: PMBI Product & MRP List (janaushadhi.gov.in). Facts only: generic name, pack, MRP. Not medical advice.

const TABLE = /*__TABLE__*/[];
const META = /*__META__*/{};

const SYNONYMS = {
  acetaminophen: "paracetamol", amoxicillin: "amoxycillin", clavulanic: "clavulanate", thyroxine: "levothyroxine",
  cholecalciferol: "vitamin d3", "vit d3": "vitamin d3", ascorbic: "vitamin c", cyanocobalamin: "vitamin b12",
  salbutamol: "salbutamol", albuterol: "salbutamol", glibenclamide: "glibenclamide", glyburide: "glibenclamide",
  frusemide: "furosemide", furosemide: "furosemide", acetylsalicylic: "aspirin", rabeprazol: "rabeprazole",
};
const IGNORE = new Set(["ip", "bp", "usp", "tablet", "tablets", "tab", "tabs", "capsule", "capsules", "cap", "caps",
  "and", "with", "of", "mg", "mcg", "g", "ml", "film", "coated", "gastro", "resistant", "prolonged", "release",
  "sustained", "extended", "er", "sr", "xr", "cr", "dr", "hydrochloride", "hcl", "maleate", "besylate", "besilate",
  "mesylate", "succinate", "tartrate", "citrate", "fumarate", "dihydrate", "monohydrate", "trihydrate", "sodium",
  "potassium", "oral", "for", "the", "uncoated", "dispersible", "chewable", "each", "per", "w", "v", "iu", "units"]);
const FORMS = ["tablet", "capsule", "syrup", "suspension", "injection", "cream", "ointment", "gel", "drops", "lotion",
  "inhaler", "powder", "solution", "spray", "sachet", "granules"];

function norm(text) {
  let t = String(text || "").toLowerCase().replace(/[()®™,;+/]/g, " ").replace(/-/g, " ");
  for (const [a, b] of Object.entries(SYNONYMS)) t = t.replace(new RegExp(`\\b${a}\\b`, "g"), b);
  return t.replace(/\s+/g, " ").trim();
}
function words(text) {
  return norm(text).split(" ").filter((w) => w.length >= 3 && !IGNORE.has(w) && !/^\d/.test(w));
}
function strengths(text) {
  const out = [];
  const re = /(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|iu|ml|%)/gi;
  let m;
  while ((m = re.exec(String(text)))) out.push(`${parseFloat(m[1])}${m[2].toLowerCase().replace("µg", "mcg")}`);
  return out;
}
// Number of active ingredients in a product name. Names join them with "and", "&", "+", "with" or "/"
// (13 Nov fix: "Sitagliptin 50mg & Metformin 500mg" was counted as ONE ingredient and matched plain Metformin).
function componentCount(name) {
  const raw = String(name || "").toLowerCase().replace(/w\/w|w\/v|v\/v/g, " ");
  return raw.split(/\band\b|&|\+|\bwith\b|\s\/\s/).filter((s) => /[a-z]{3}/.test(s)).length;
}

// "Pantoprazole 40 mg + Domperidone 30 mg" -> [{words:[pantoprazole], strength:"40mg"}, ...]
function parseQuery(salts) {
  const parts = String(salts || "").split(/\+|,|\band\b|;|\n/i).map((s) => s.trim()).filter(Boolean);
  return parts.map((p) => ({ text: p, words: words(p), strength: strengths(p)[0] || null })).filter((c) => c.words.length);
}

// Release type (SR/ER/XR...) changes how a medicine works; never call plain and slow-release "exact".
// Gastro-resistant / enteric coating is not counted (all Jan Aushadhi pantoprazole etc. is gastro-resistant).
const RELEASE = /\b(sr|er|xr|cr|xl|pr|prolonged|sustained|extended|controlled|modified)\b/i;
function hasRelease(text) {
  return RELEASE.test(String(text || ""));
}

function scoreProduct(p, comps, form, queryText) {
  const name = norm(p.name);
  const nameStrengths = strengths(p.name);
  let saltHits = 0, strengthHits = 0;
  for (const c of comps) {
    if (c.words.every((w) => new RegExp(`\\b${w}`).test(name))) {
      saltHits += 1;
      if (c.strength && nameStrengths.includes(c.strength)) strengthHits += 1;
    }
  }
  if (!saltHits) return null;
  const extra = Math.max(0, componentCount(p.name) - comps.length);
  const formOk = !form || p.form === form;
  const allSalts = saltHits === comps.length;
  const allStrengths = strengthHits === comps.filter((c) => c.strength).length;
  const releaseOk = hasRelease(p.name) === hasRelease(queryText);
  let match = "partial";
  if (allSalts && extra === 0 && allStrengths && formOk && releaseOk) match = "exact";
  else if (allSalts && extra === 0 && allStrengths && !releaseOk) match = "same salt, different release type (SR/ER) - ask the pharmacist";
  else if (allSalts && extra === 0) match = allStrengths ? "same medicine, different form" : "same salt, different strength";
  const score = saltHits * 10 + strengthHits * 6 - extra * 8 + (formOk ? 3 : 0) + (allSalts ? 10 : 0) + (releaseOk ? 4 : 0);
  return { score, match };
}

export class JanAushadhiLookup {
  // args: { salts: "Pantoprazole 40mg + Domperidone 30mg", form?: "tablet", max_results?: 5 }
  invoke(args) {
    const comps = parseQuery(args.salts || args.inquiry || "");
    if (!comps.length) return { error: "Give the salt (generic) names with strength, e.g. 'Telmisartan 40 mg'." };
    const form = FORMS.find((f) => String(args.form || "").toLowerCase().startsWith(f.slice(0, 5))) || "";
    const scored = [];
    for (const p of TABLE) {
      const s = scoreProduct(p, comps, form, args.salts || args.inquiry || "");
      if (s) scored.push({ ...s, p });
    }
    scored.sort((a, b) => b.score - a.score || (a.p.per_unit ?? 1e9) - (b.p.per_unit ?? 1e9));
    const max = Math.min(Number(args.max_results) || 5, 8);
    const results = scored.slice(0, max).map(({ match, p }) => ({
      match, drug_code: p.code, generic_name: p.name, pack: p.pack, mrp_rs: p.mrp, price_per_unit_rs: p.per_unit,
      group: p.group,
    }));
    return {
      query: comps.map((c) => c.text),
      found: results.length > 0,
      best_match: results[0]?.match || "none",
      results,
      source: `${META.source} (list dated ${META.as_of}). Prices are Jan Aushadhi MRPs; buy at a Jan Aushadhi Kendra.`,
      note: "Same salt and strength only. Never change the dose or switch medicine without the doctor or pharmacist.",
    };
  }
}

export class JanAushadhiInfo {
  invoke() {
    return {
      products_in_list: META.count, list_date: META.as_of, source: META.source,
      find_a_kendra: "Jan Aushadhi Sugam app, or janaushadhi.gov.in → Locate Kendra; toll-free 1800-180-8080",
    };
  }
}
