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
| “আমার মা Glycomet GP 1 আর Ecosprin 75 খান। সস্তা কোনটা?” | Answer in Bengali: Glimepiride 1 mg + Metformin 500 mg → ₹18.15/10; Aspirin 75 mg generic. |
| Lookup tool alone (`node tools/test_lookup.mjs`) | 10 of 11 common medicines matched exactly on salt + strength; the 11th (Pan-D) is a capsule in the official list and is reported as such. |

## Community contributions

1. **Two fixes to the reference nsDeploy runtime for Gemini 3** (`*/runtime/llm.js`, see `runtime/CHANGES.md`):
   keep the tool-call `thought_signature`, and route streamed parallel tool calls by `id`. Without them every
   Gemini 3 tool call fails with HTTP 400.
2. **Free BYOK with Gemini:** Gemini's OpenAI-compatible endpoint
   `https://generativelanguage.googleapis.com/v1beta/openai` allows browser CORS, so a free Google AI Studio key works
   on any static agentic site (use the model id exactly as listed, e.g. `models/gemini-3.5-flash-lite`).
3. **A reusable public network:** the Jan Aushadhi Price Desk — see "Call this network" on its home page.

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
