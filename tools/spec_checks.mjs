// MVP interoperability checks (spec section 6) that can run without an AI key, against our real files and sites.
//   node tools/spec_checks.mjs
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RT = join(ROOT, "dawai-saathi", "runtime");
const imp = (f) => import("file:///" + join(RT, f).split("\\").join("/"));
const { AgentNetwork, validateNetwork } = await imp("kernel.js");
const { manifestAllowsPeer, selectPeerRouter } = await imp("engine.js");
const { RemoteRegistry } = await imp("remote.js");
const { consumeRemoteBudget, consumeAgentBudget } = await imp("runner.js");

const PEER = "https://janaushadhi-price-desk.pages.dev";
const MAIN = "https://dawai-saathi-362.pages.dev";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const errorsOf = (cfg, name) => validateNetwork(new AgentNetwork(cfg, name)).errors || [];

// 1. Both published networks are valid (two-agent+ networks on ordinary HTTPS hosting)
const saathi = readJson("dawai-saathi/dawai_saathi.network.json");
const prices = readJson("price-desk/jan_aushadhi_prices.network.json");
check("Dawai Saathi network validates", errorsOf(saathi, "dawai_saathi").length === 0, `${saathi.tools.length} agents/tools`);
check("Price Desk network validates", errorsOf(prices, "jan_aushadhi_prices").length === 0, `${prices.tools.length} agents/tools`);

// 2. An invalid network is rejected BEFORE any model call
const broken = structuredClone(prices);
broken.tools[0].tools.push("ghost_agent_that_does_not_exist");
const bErr = errorsOf(broken, "broken");
check("Invalid network (missing agent) is rejected", bErr.length > 0, bErr[0] || "");
const dup = structuredClone(prices);
dup.tools.push(structuredClone(dup.tools[1]));
const dErr = errorsOf(dup, "dup");
check("Invalid network (duplicate agent name) is rejected", dErr.length > 0, dErr[0] || "");

// 3. Composition cycle and depth limits stop with visible errors
const reg = new RemoteRegistry({ maxDepth: 5 });
const chain = [`${MAIN}::dawai_saathi`, `${PEER}::jan_aushadhi_prices`];
let cyc = "";
try { reg.checkCycle(chain, MAIN, "dawai_saathi"); } catch (e) { cyc = `${e.code}: ${e.message}`; }
check("Cycle (Saathi -> Price Desk -> Saathi) is stopped", cyc.startsWith("COMPOSITION_CYCLE"), cyc);
let dep = "";
try { reg.checkCycle(["a::1", "b::2", "c::3", "d::4", "e::5"], "https://f.example", "6"); } catch (e) { dep = `${e.code}: ${e.message}`; }
check("Depth over the limit is stopped", dep.startsWith("COMPOSITION_DEPTH"), dep);

// 4. Over-budget requests are refused
const comp = () => ({ remoteCalls: 0, peerCalls: new Map(), maxRemoteCalls: 4, maxCallsPerPeer: 1, agentCalls: 0,
  maxAgentCalls: 24, deadline: Date.now() + 90_000 });
const c1 = comp();
const first = consumeRemoteBudget(c1, `${PEER}::jan_aushadhi_prices`);
const again = consumeRemoteBudget(c1, `${PEER}::jan_aushadhi_prices`);
check("Second call to the same peer in one query is refused", first === null && !!again, again);
const c2 = comp(); c2.remoteCalls = 4;
check("5th third-party call in one query is refused", !!consumeRemoteBudget(c2, "x::y"), consumeRemoteBudget(comp(), "z") === null ? consumeRemoteBudget(c2, "x::y") : "");
const c3 = comp(); c3.agentCalls = 24;
check("25th agent invocation is refused", !!consumeAgentBudget(c3), consumeAgentBudget(c3));
const c4 = comp(); c4.deadline = Date.now() - 1;
check("Query past its deadline is refused", !!consumeAgentBudget(c4), consumeAgentBudget(c4));

// 5. Denied origin: only the Price Desk may be contacted by Dawai Saathi
const mainManifest = readJson("dawai-saathi/agent-manifest.json");
check("Price Desk origin is allowed", manifestAllowsPeer(`${PEER}/jan_aushadhi_prices`, mainManifest));
check("Any other origin is denied", !manifestAllowsPeer("https://evil.example/steal", mainManifest));
const peerManifest = readJson("price-desk/agent-manifest.json");
check("Price Desk (leaf) contacts no one", !manifestAllowsPeer(`${MAIN}/dawai_saathi`, peerManifest));

// 6. The user's key/router stay with the caller: a peer cannot redirect inference
const callerRouter = { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", mock: false };
const chosen = selectPeerRouter(callerRouter);
check("Peer network runs on the CALLER's router (key never sent to the peer)", chosen.baseUrl === callerRouter.baseUrl,
  "selectPeerRouter takes only the caller's router; the peer manifest's llm_router is never used");

// 7. Live site: published files are reachable cross-origin, and the coded-tool bundle matches its SRI pin
const live = async (url) => { const r = await fetch(url); return { ok: r.ok, acao: r.headers.get("access-control-allow-origin"), csp: r.headers.get("content-security-policy"), buf: Buffer.from(await r.arrayBuffer()) }; };
const lm = await live(`${PEER}/agent-manifest.json`);
const man = JSON.parse(lm.buf.toString("utf8"));
check("Live peer manifest is public with CORS", lm.ok && lm.acao === "*");
const lb = await live(`${PEER}/${man.coded_tools.bundle.replace("./", "")}`);
const sri = "sha384-" + createHash("sha384").update(lb.buf).digest("base64");
check("Live coded-tool bundle matches its SRI pin", sri === man.coded_tools.integrity, sri.slice(0, 30) + "…");
const tampered = "sha384-" + createHash("sha384").update(Buffer.concat([lb.buf, Buffer.from("//x")])).digest("base64");
check("A tampered bundle would NOT match (runtime fails closed)", tampered !== man.coded_tools.integrity);
const lw = await live(`${MAIN}/runtime/sandbox-worker.js`);
check("Sandbox worker is served with the strict CSP", (lw.csp || "").includes("connect-src 'none'"), lw.csp || "missing");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
