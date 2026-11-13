// Page state for Dawai Saathi: the user's saved medicine list (this browser only) and its rendering.
const KEY = "dawai-saathi-list-v1";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
let items = load();

export function getState() {
  const total = items.reduce((s, i) => s + (Number(i.saving_per_month_rs) || 0), 0);
  return { saved_medicines: items, total_saving_per_month_rs: Math.round(total * 100) / 100,
           note: "Saved only in this browser. Nothing is sent to any server." };
}

export function saveList(newItems) {
  items = newItems.map((i) => ({ ...i, saved_at: new Date().toISOString().slice(0, 10) }));
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  render();
  return { saved: items.length, ...getState() };
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function render() {
  const box = document.querySelector("#my-list");
  if (!box) return;
  if (!items.length) {
    box.innerHTML = `<p class="muted">Your list is empty. Ask the helper, then say “save my list”.</p>`;
    return;
  }
  const total = getState().total_saving_per_month_rs;
  box.innerHTML = `<table><thead><tr><th>Medicine</th><th>Salt</th><th>Jan Aushadhi generic</th><th>MRP</th><th>Saving / month</th></tr></thead><tbody>${
    items.map((i) => `<tr><td>${esc(i.as_written)}</td><td>${esc(i.salts)}</td><td>${esc(i.jan_aushadhi_name || "—")}${
      i.drug_code ? `<br><span class="muted">Drug code ${esc(i.drug_code)}${i.pack ? " · " + esc(i.pack) : ""}</span>` : ""}</td><td>${
      i.mrp_rs != null ? "₹" + esc(i.mrp_rs) : "—"}</td><td>${i.saving_per_month_rs != null ? "₹" + esc(i.saving_per_month_rs) : "—"}</td></tr>`).join("")
  }</tbody></table>${total ? `<p class="total">Total saving: <b>₹${esc(total)} a month</b> · ₹${esc(Math.round(total * 12))} a year</p>` : ""}
  <p class="muted">Show this list at a Jan Aushadhi Kendra. Ask your doctor or pharmacist before switching.</p>
  <div class="row"><button id="print-list">Print for the pharmacist</button><button id="clear-list" class="ghost">Clear list</button></div>`;
  box.querySelector("#print-list").onclick = () => window.print();
  box.querySelector("#clear-list").onclick = () => { if (confirm("Clear the saved list?")) saveList([]); };
}

document.addEventListener("DOMContentLoaded", render);
render();
