// Writes agent-manifest.json, links.json, agent-mcp.json and _headers for both sites, with SRI hashes of the coded-tool
// bundles.   node tools/make_manifests.mjs [priceDeskUrl] [dawaiSaathiUrl]
// Defaults are the planned Cloudflare Pages URLs; pass local URLs for local testing, e.g.
//   node tools/make_manifests.mjs http://127.0.0.1:8791 http://127.0.0.1:8792
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRICE_URL = (process.argv[2] || "https://janaushadhi-price-desk.pages.dev").replace(/\/$/, "");
const SAATHI_URL = (process.argv[3] || "https://dawai-saathi-362.pages.dev").replace(/\/$/, "");
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/openai";

const sri = (file) => "sha384-" + createHash("sha384").update(readFileSync(file)).digest("base64");
const write = (site, name, obj) =>
  writeFileSync(join(ROOT, site, name), typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) + "\n");

const router = { base_url: GEMINI, byok_router: GEMINI, mock: false,
  note: "Bring your own key. A free Google AI Studio (Gemini) key works: router https://generativelanguage.googleapis.com/v1beta/openai, model gemini-3.5-flash-lite. OpenAI or OpenRouter keys also work." };
const deployment = { mode: "static", self_contained_runtime: true, browser_mock: false, direct_byok: true,
  direct_mcp_requires_cors: true, public_mcp_facade: false };
const noMcp = (network, front) => ({ protocol: "nsdeploy-agent-mcp/v1", network, front_man: front, available: false,
  reason: "Static site: no public MCP facade. Call this network as a peer agent network instead (it runs in your browser)." });

// Public agent artifacts must be readable by other origins (peer loading); the sandbox worker needs a strict CSP.
const HEADERS = `/agent-manifest.json
  Access-Control-Allow-Origin: *
  Cache-Control: no-cache
/links.json
  Access-Control-Allow-Origin: *
  Cache-Control: no-cache
/agent-mcp.json
  Access-Control-Allow-Origin: *
/*.network.json
  Access-Control-Allow-Origin: *
  Cache-Control: no-cache
/tools/*
  Access-Control-Allow-Origin: *
  Cache-Control: no-cache
/data/*
  Access-Control-Allow-Origin: *
/runtime/sandbox-worker.js
  Content-Security-Policy: default-src 'none'; script-src blob:; connect-src 'none'; worker-src 'none'
`;

// ---- price desk (peer, callable by any site) -------------------------------------------------------------------
const P = "price-desk";
write(P, "agent-manifest.json", {
  brand: "Jan Aushadhi Price Desk",
  networks: [{
    name: "jan_aushadhi_prices", front_man: "jan_aushadhi_price_desk", hocon: "./jan_aushadhi_prices.network.json",
    description: "Official Jan Aushadhi generic, pack and MRP for any medicine (salt + strength). Callable by any agentic website.",
    tags: ["health", "india", "jan-aushadhi", "generic-medicines", "prices", "public"],
    sample_queries: ["Telmisartan 40 mg", "Pantoprazole 40 mg + Domperidone 30 mg; Metformin 500 mg"],
  }],
  llm_router: router,
  allowed_peers: [],
  peer_policy: { mode: "closed", deny_origins: [], note: "Leaf network: it calls no other site. Its price tool is a sandboxed coded tool." },
  agent_mcp: noMcp("jan_aushadhi_prices", "jan_aushadhi_price_desk"),
  coded_tools: { bundle: "./tools/price_lookup.js", integrity: sri(join(ROOT, P, "tools", "price_lookup.js")) },
  theme: { primary: "#1d6b4f" },
  linking: { protocol: "nsdeploy-link/v1", exports: [{ network: "jan_aushadhi_prices", front_man: "jan_aushadhi_price_desk",
    aliases: ["jan_aushadhi_prices", "jan_aushadhi_price_desk", "generic_medicine_prices"], url: "jan_aushadhi_prices" }],
    imports: [], link_updates: { mode: "browser-local" } },
  deployment,
});
write(P, "links.json", { version: 1, networks: { jan_aushadhi_prices: {} } });
write(P, "agent-mcp.json", noMcp("jan_aushadhi_prices", "jan_aushadhi_price_desk"));
write(P, "_headers", HEADERS);

// ---- Dawai Saathi (main site; calls the price desk as a peer) ----------------------------------------------------
const D = "dawai-saathi";
write(D, "agent-manifest.json", {
  brand: "Dawai Saathi",
  networks: [{
    name: "dawai_saathi", front_man: "dawai_saathi_desk", hocon: "./dawai_saathi.network.json",
    description: "Find the cheaper Jan Aushadhi generic for the medicines your doctor wrote, in Bengali, Hindi or English, and see your monthly saving.",
    tags: ["health", "india", "jan-aushadhi", "multilingual", "savings"],
    sample_queries: ["Doctor wrote Pan-D and Telma 40. Is there a cheaper one?",
      "আমার মা Glycomet GP 1 আর Ecosprin 75 খান। সস্তা কোনটা?", "मेरे पापा Rosuvas 10 और Amlong 5 लेते हैं, सस्ता विकल्प?"],
  }],
  llm_router: router,
  allowed_peers: [PRICE_URL],
  peer_policy: { mode: "closed", deny_origins: [], note: "Only the Jan Aushadhi Price Desk may be contacted, after the user approves." },
  agent_mcp: noMcp("dawai_saathi", "dawai_saathi_desk"),
  coded_tools: { bundle: "./tools/brand_lookup.js", integrity: sri(join(ROOT, D, "tools", "brand_lookup.js")) },
  theme: { primary: "#1d6b4f" },
  linking: { protocol: "nsdeploy-link/v1", exports: [{ network: "dawai_saathi", front_man: "dawai_saathi_desk",
    aliases: ["dawai_saathi"], url: "dawai_saathi" }],
    imports: [{ reference: "jan_aushadhi_prices", url: `${PRICE_URL}/jan_aushadhi_prices` }],
    link_updates: { mode: "browser-local" } },
  deployment,
  actions: { version: 1, module: "./saathi-actions.js",
    agentTools: ["get_my_medicines", "calculate_monthly_saving", "save_medicine_list"] },
});
write(D, "links.json", { version: 1, networks: { dawai_saathi: { jan_aushadhi_prices: `${PRICE_URL}/jan_aushadhi_prices` } } });
write(D, "agent-mcp.json", noMcp("dawai_saathi", "dawai_saathi_desk"));
write(D, "_headers", HEADERS);
console.log("manifests written; peer =", PRICE_URL, "; main =", SAATHI_URL);
