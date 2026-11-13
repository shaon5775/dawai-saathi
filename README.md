# 💊 Dawai Saathi + 🏛️ Jan Aushadhi Price Desk

Two connected **open agentic websites** for the [Open Agentic Web Challenge](https://cognizant-agenticweb.devpost.com/):

| Site | What it is | Live |
|---|---|---|
| **Dawai Saathi** | A family helper. Say the medicines your doctor wrote — in Bengali, Hindi or English — and see the cheaper Jan Aushadhi generic with the same salt and strength, plus your exact monthly saving. | https://dawai-saathi-362.pages.dev |
| **Jan Aushadhi Price Desk** | The official Jan Aushadhi Product & MRP list (2,100 medicines with a price) as a public agent network that **any** pharmacy, hospital, NGO or health website can call. | https://janaushadhi-price-desk.pages.dev |

## Why

Most Indian families pay for medicines out of their own pocket. The government's **Jan Aushadhi** stores sell the same
salt as a quality generic, often 50–80% cheaper — but people do not know the generic name of *Pan-D* or *Telma 40*, or
whether a cheaper one exists. Small pharmacies and NGOs cannot afford to build and run an AI assistant either.

On the open agentic web the agents run in the visitor's browser with the **visitor's own AI key** (a free Gemini key
works), so neither site pays for AI, and the price list is published once and reused by every site that links to it.

## How it works

```
User (bn / hi / en)                      dawai-saathi-362.pages.dev                janaushadhi-price-desk.pages.dev
"Doctor wrote Pan-D and Telma 40"  ──►  dawai_saathi_desk (front agent)
                                          ├─ medicine_reader ──► brand_to_salt  (coded tool, sandboxed)
                                          ├─ jan_aushadhi_prices ── link slot ── consent ──►  jan_aushadhi_prices network
                                          │      (peer network fetched and run LOCALLY        └─ jan_aushadhi_lookup
                                          │       in the caller's browser, caller's key)         (coded tool: official
                                          │                                                        PMBI table, exact
                                          ├─ website_calculate_monthly_saving  (site action,       salt + strength match)
                                          │      exact maths in code)
                                          └─ website_save_medicine_list (site action, asks first; this browser only)
```

- **Two origins, one web of agents.** Dawai Saathi binds the symbolic link slot `jan_aushadhi_prices` to the Price
  Desk in `links.json`; the runtime asks the user before contacting it, then loads its manifest and network JSON and
  runs it in the same browser with the caller's router. The key is never sent to either site.
- **No guessed prices.** Prices come from a coded tool (`price-desk/tools/price_lookup.js`, SRI-pinned in the
  manifest) that carries the official table and runs in the runtime's network-less sandbox worker. Brand → salt is a
  second coded tool with ~100 common Indian brands; unknown brands are never guessed (the user is asked to read the
  generic name on the strip).
- **Exact rupees.** The monthly saving is a site action (`dawai-saathi/saathi-actions.js`), not model arithmetic.
- **Safety.** Facts only: never changes a medicine or dose; every answer ends with "show this to your doctor or
  pharmacist before switching".
- **Generative UI.** When numbers are missing, the agent renders a CRUSE form (strip price, tablets per strip,
  tablets per day) in the user's language.

## Live test (13 Nov 2026, free Gemini key, model `models/gemini-3.5-flash-lite`)

| Question | Result |
|---|---|
| “Doctor wrote Pan-D and Telma 40. Is there a cheaper one?” | Pan-D → Pantoprazole 40 mg + Domperidone 30 mg → Jan Aushadhi capsules ₹22.69/10 (₹2.27 each); Telma 40 → Telmisartan 40 mg → ₹12.38/10 (₹1.24). Example prices ₹250 and ₹200 per strip of 15, one a day → **₹794.79 saved per month** (checked by hand). |
| “আমার মা Glycomet GP 1 আর Ecosprin 75 খান। সস্তা কোনটা?” | Answer in Bengali with salts, Jan Aushadhi generic, pack and MRP. |
| “मेरे पापा Rosuvas 10 और Amlong 5 लेते हैं, सस्ता विकल्प?” | Answer in Hindi: Rosuvastatin 10 mg → ₹19.28/15 (₹1.29 each); Amlodipine 5 mg → ₹5.68/10 (₹0.57); then asks before saving the list. |
| Same, user clicks **Decline** on the consent dialog | Salts only, says prices could not be fetched, invents nothing, points to the Kendra helpline. |
| Phone (375 px) | Both sites fit with no sideways scrolling; chat, agents panel and settings stack. |

### Safety of the price match (`node tools/test_lookup.mjs`)

- “exact” means same salts, same strengths, same form **and same release type**. A single-salt query never matches a
  combination product (e.g. Metformin 500 mg ≠ Sitagliptin 50 mg & Metformin 500 mg), and plain ≠ SR/ER
  (“same salt, different release type — ask the pharmacist”). Pan-D (Domperidone SR capsule) still matches exactly.
- Common medicines: 9 of 11 exact; the other two are honestly labelled (form or release type differs).

### Spec checks without an AI key (`node tools/spec_checks.mjs` → 18 passed)

Both networks validate; a network with a missing or **duplicate** agent is rejected before any model call; a
Saathi → Price Desk → Saathi cycle and a depth over 5 are stopped; budgets (one call per peer, 4 third-party calls,
24 agent calls, 90 s) refuse over-budget requests; only the Price Desk origin is allowed and the Price Desk calls no
one; peers always run on the caller's router (the key never goes to a peer); the live coded-tool bundle matches its
SRI pin (a tampered one would not); the sandbox worker is served with the strict CSP.

## Community contributions

1. **Three fixes to the reference nsDeploy runtime** (see `runtime/CHANGES.md`): for Gemini 3, keep the tool-call
   `thought_signature` and route streamed parallel tool calls by `id` (without them every Gemini 3 tool call fails
   with HTTP 400); and reject duplicate agent names, as the MVP spec requires.
2. **`tools/spec_checks.mjs`** — a reusable, key-free check of the spec's MVP interoperability rules against any
   pair of published sites.
3. **Free BYOK with Gemini:** Gemini's OpenAI-compatible endpoint
   `https://generativelanguage.googleapis.com/v1beta/openai` allows browser CORS, so a free Google AI Studio key works
   on any static agentic site (use the model id exactly as listed, e.g. `models/gemini-3.5-flash-lite`).
4. **A reusable public network:** the Jan Aushadhi Price Desk — see "Call this network" on its home page.

## Repository layout

```
price-desk/      the Price Desk site (network JSON, manifest, coded tool + data, page, runtime/)
dawai-saathi/    the Dawai Saathi site (network JSON, manifest, brand tool, site actions, page, runtime/)
tools/           build_price_table.py (CSV → table + bundle), make_manifests.mjs (manifests, SRI, _headers), tests
data/            the official PMBI Product & MRP list CSV (downloaded 12 Nov 2026)
```

Rebuild: `python tools/build_price_table.py data/janaushadhi_products_2026-11-12.csv` →
`node tools/make_manifests.mjs` → deploy each folder as a static site (Cloudflare Pages; `_headers` sets CORS for the
public agent files and the CSP the sandbox worker requires).

## Data and licences

- Prices: Pharmaceuticals & Medical Devices Bureau of India (PMBI), *Product & MRP List*, janaushadhi.gov.in,
  downloaded 12 Nov 2026. Products with MRP 0 ("under process") are left out. Check the Kendra for current prices.
- Brand names belong to their owners and are used only to identify the salt.
- Runtime: nsDeploy browser runtime from cognizant-ai-labs/agentic-web, Apache-2.0, with the changes listed above.
- This project: Apache-2.0. Independent project; not affiliated with PMBI or the Government of India.
  Not medical advice.
