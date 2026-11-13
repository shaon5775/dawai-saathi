import { boot } from "./runtime/index.js";
import { JanAushadhiLookup } from "./tools/price_lookup.js";

const siteBase = new URL("./", import.meta.url).href;
document.querySelectorAll(".me").forEach((el) => { el.textContent = siteBase.replace(/\/$/, ""); });

// Quick search: the same lookup code the agents use, run directly on the page (no AI involved).
const lookup = new JanAushadhiLookup();
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
document.querySelector("#quick").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = document.querySelector("#q").value.trim();
  const box = document.querySelector("#results");
  if (!q) { box.innerHTML = ""; return; }
  const r = lookup.invoke({ salts: q, max_results: 6 });
  if (r.error || !r.found) { box.innerHTML = `<p class="muted">${esc(r.error || "No Jan Aushadhi product found for that salt.")}</p>`; return; }
  box.innerHTML = `<table><thead><tr><th>Match</th><th>Jan Aushadhi generic</th><th>Pack</th><th>MRP</th><th>Per unit</th><th>Code</th></tr></thead><tbody>${
    r.results.map((p) => `<tr><td><span class="tag ${p.match === "exact" ? "ok" : ""}">${esc(p.match)}</span></td><td>${esc(p.generic_name)}<br><span class="muted">${esc(p.group)}</span></td><td>${esc(p.pack)}</td><td>₹${esc(p.mrp_rs)}</td><td>${p.price_per_unit_rs != null ? "₹" + esc(p.price_per_unit_rs) : "—"}</td><td>${esc(p.drug_code)}</td></tr>`).join("")
  }</tbody></table><p class="muted">${esc(r.source)}</p>`;
});

const status = document.querySelector("#assistant-status");
try {
  await boot("#agent-app", { originUrl: siteBase, sandboxWorkerUrl: new URL("runtime/sandbox-worker.js", siteBase).href });
  status.textContent = "Agent ready. Add your own AI key in ⚙ settings below (a free Gemini key works).";
} catch (error) {
  status.textContent = `Agent unavailable: ${error.message}`;
  console.error(error);
}
